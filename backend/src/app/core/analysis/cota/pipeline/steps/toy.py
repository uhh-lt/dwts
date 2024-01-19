from datetime import datetime
from typing import Dict, List

import numpy as np
import torch

# This would be necessary to use a GPU within Celery. But there are multiple issues with this. So we disable it!
# try:
#     torch.multiprocessing.set_start_method('spawn')
# except RuntimeError:
#     pass
from loguru import logger
from tqdm import tqdm

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.analysis.cota.pipeline.concept_embedding_model import (
    ConceptEmbeddingModel,
)
from app.core.analysis.cota.pipeline.steps.util import (
    _apply_umap,
    _create_training_dataloader,
    _get_annotation_sentence_indices,
    _has_min_concept_sentence_annotations,
    _load_embeddings,
    _load_model,
    _store_embeddings,
    _store_model,
)
from app.core.analysis.cota.service import COTAService
from app.core.data.dto.concept_over_time_analysis import COTASentence, COTAUpdate
from app.core.data.dto.search import SimSearchQuery
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.core.search.simsearch_service import SimSearchService
from app.trainer.trainer_service import TrainerService

cota_service: COTAService = COTAService()
sqls: SQLService = SQLService()
repo: RepoService = RepoService()
trainer: TrainerService = TrainerService()
sims: SimSearchService = SimSearchService()


SEARCH_SPACE_TOP_K = 1000
SEARCH_SPACE_THRESHOLD = 0.0001
UMAP_REDUCED_EMBEDDINGS_DIM = 64
CEM_NUM_LAYERS = 5
CEM_DIM = UMAP_REDUCED_EMBEDDINGS_DIM
CEM_TRAIN_NUM_EPOCHS = 5

# unfortunately, we cannot use a GPU here, because we are running inside a Celery worker!
COTA_COMPUTE_DEVICE = "cpu"


def init_or_load_initial_search_space(cargo: Cargo) -> Cargo:
    cota = cargo.job.cota

    # the search space is not empty, we dont need to do anything
    if len(cota.search_space) > 0:
        cargo.data["search_space"] = cota.search_space
        return cargo

    # the search space is empty, we build the search space with simsearch
    search_space_dict: Dict[
        str, COTASentence
    ] = dict()  # we use a dict here to prevent duplicates in the search space
    for concept in cota.concepts:
        # find similar sentences for each concept to define search space
        sents = sims.find_similar_sentences(
            query=SimSearchQuery(
                proj_id=cota.project_id,
                query=concept.description,
                top_k=SEARCH_SPACE_TOP_K,
                threshold=SEARCH_SPACE_THRESHOLD,
            )
        )

        for sent in sents:
            cota_sentence_id = f"{sent.sentence_id}-{sent.sdoc_id}"
            cota_sentence = search_space_dict.get(
                cota_sentence_id,
                COTASentence(
                    sdoc_id=sent.sdoc_id,
                    sentence_id=sent.sentence_id,
                    concept_annotation=None,
                    concept_similarities={concept.id: 0.0 for concept in cota.concepts},
                    x=0.0,
                    y=0.0,
                    date=datetime.now(),
                ),
            )
            cota_sentence.concept_similarities[concept.id] = sent.score
            search_space_dict[cota_sentence_id] = cota_sentence

    # update the cota with the search space
    search_space = list(search_space_dict.values())
    cargo.data["search_space"] = search_space

    return cargo


def init_search_space_reduced_embeddings(cargo: Cargo) -> Cargo:
    # if the embeddings exists, we dont need to do anything
    if repo.embeddings_exists(
        proj_id=cargo.job.cota.project_id, embedding_name=str(cargo.job.cota.id)
    ):
        return cargo

    # if the search space is empty, we cannot compute reduced embeddings
    if len(cargo.data["search_space"]) == 0:
        search_space_reduced_embeddings = np.array([])
    else:
        # 1. Get the embeddings for the search space sentences from weaviate
        search_space_embeddings = sims.get_sentence_embeddings(
            search_tuples=[
                (cota_sent.sentence_id, cota_sent.sdoc_id)
                for cota_sent in cargo.data["search_space"]
            ]
        )
        # 2. Reduce the embeddings with UMAP (or do we want to use PCA here?)
        search_space_reduced_embeddings = _apply_umap(
            embs=search_space_embeddings, n_components=UMAP_REDUCED_EMBEDDINGS_DIM
        )

    # 3. Store the reduced embeddings on the file system
    _store_embeddings(cargo=cargo, embeddings=search_space_reduced_embeddings)

    return cargo


def init_concept_embedding_model(cargo: Cargo) -> Cargo:
    # if the model exists, we dont need to do anything
    if repo.model_exists(
        proj_id=cargo.job.cota.project_id, model_name=str(cargo.job.cota.id)
    ):
        return cargo

    # We dont need to create a model, if no annotations exist, because we can't train it anyway
    if not _has_min_concept_sentence_annotations(cargo):
        return cargo

    # 1. Define model
    model = ConceptEmbeddingModel(
        num_layers=CEM_NUM_LAYERS,
        input_dim=CEM_DIM,
        hidden_dim=CEM_DIM,
        output_dim=CEM_DIM,
    )

    # 2. Store model
    _store_model(cargo=cargo, model=model)

    return cargo


def train_cem(cargo: Cargo) -> Cargo:
    # Only train if we have a model
    if not repo.model_exists(
        proj_id=cargo.job.cota.project_id, model_name=str(cargo.job.cota.id)
    ):
        return cargo

    # Only train if we have enough annotated data
    if not _has_min_concept_sentence_annotations(cargo):
        return cargo

    # 1. Create the training data
    train_dl = _create_training_dataloader(cargo=cargo)

    # prepare model for training
    model = _load_model(cargo=cargo, eval=False, device=COTA_COMPUTE_DEVICE)
    optimizer = model.build_optimizer()

    batch_desc = "Batch: {BATCH} - Running Loss: {LOSS:.3f}"
    for epoch in tqdm(
        range(CEM_TRAIN_NUM_EPOCHS),
        total=CEM_TRAIN_NUM_EPOCHS,
        desc="Training ConceptEmbeddingModel -- Epoch:",
        position=0,
    ):  # loop over the dataset multiple times
        running_loss = 0.0
        for batch_idx, batch in (
            batch_pbar := tqdm(
                enumerate(train_dl),
                total=len(train_dl),
                desc=batch_desc.format(BATCH=0, LOSS=0.0),
                position=1,
            )
        ):
            # zero the parameter gradients
            optimizer.zero_grad()

            # forward + backward + optimize
            embeddings = batch["embeddings"].to(COTA_COMPUTE_DEVICE)
            labels = batch["labels"].to(COTA_COMPUTE_DEVICE)
            outs = model(embeddings, labels)
            optimizer.step()

            # print statistics
            running_loss += outs["loss"].item()
            if batch_idx % 20 == 19:
                logger.debug(
                    f"[epoch={epoch + 1}, batch={batch_idx + 1:5d}] loss: {running_loss / 20:.3f}"
                )
                running_loss = 0.0

                batch_pbar.set_description(
                    batch_desc.format(BATCH=batch_idx + 1, LOSS=running_loss)
                )

    _store_model(cargo=cargo, model=model)

    return cargo


def refine_search_space_reduced_embeddings_with_cem(cargo: Cargo) -> Cargo:
    # 1. Load the reduced embeddings
    reduced_embeddings = _load_embeddings(cargo=cargo)

    # if no model exists, the refined embeddings are the reduced embeddings
    if not repo.model_exists(
        proj_id=cargo.job.cota.project_id, model_name=str(cargo.job.cota.id)
    ):
        refined_embeddings = reduced_embeddings
    else:
        # 1. Load the CEM
        model = _load_model(cargo=cargo, eval=True, device=COTA_COMPUTE_DEVICE)

        # 2. Refine the search space reduced embeddings with the CEM
        with torch.no_grad():
            refined_embeddings: torch.Tensor = model(reduced_embeddings)

    # # Overwrite Embeddings? R
    # torch.save(refined_embeddings, embedding_path)

    # 4. Update cargo with the refined search space reduced embeddings
    # Not necessary?
    cargo.data["refined_search_space_reduced_embeddings"] = refined_embeddings

    return cargo


def compute_result(cargo: Cargo) -> Cargo:
    # from app.core.data.repo.repo_service import RepoService

    # repo: RepoService = RepoService()

    # 1. Read the required data
    # embedding_path = repo.get_embedding_path(
    #     proj_id=cargo.job.cota.project_id, embedding_name=str(cargo.job.cota.id)
    # )
    # refined_embeddings = torch.load(embedding_path)

    # 2. rank search space sentences for each concept
    # this can only be done if a concept has sentence annotations, because we need those to compute the concept representation
    # if we do not have sentence annotations, the ranking / similarities were already computed by the initial simsearch (in the first step)
    if _has_min_concept_sentence_annotations(cargo):
        # 2.1 compute representation for each concept
        concept_embeddings = __compute_concept_embeddings(cargo)

        # 2.2  compute similarity of average representation to each sentence
        concept_similarities = __compute_concept_to_sentence_similarities(
            cargo, concept_embeddings
        )

        # 2.3 update search_space with the concept similarities
        __update_search_space_with_concept_similarities(cargo, concept_similarities)

    # 3. Visualize results: Reduce the refined embeddings with UMAP to 2D
    # 3.1 reduce the dimensionality of the refined embeddings with UMAP
    refined_embeddings: torch.Tensor = cargo.data[
        "refined_search_space_reduced_embeddings"
    ]
    visual_refined_embeddings = _apply_umap(
        embs=refined_embeddings, n_components=2, return_list=True
    )

    # 3.2 update search_space with the 2D coordinates
    __update_search_space_with_2D_coords(cargo, visual_refined_embeddings)

    return cargo


def __compute_concept_embeddings(cargo: Cargo) -> Dict[str, torch.Tensor]:
    refined_embeddings: torch.Tensor = cargo.data[
        "refined_search_space_reduced_embeddings"
    ]
    annotation_indices = _get_annotation_sentence_indices(cargo)
    # Dict[concept_id, concept_embedding]
    concept_embeddings: Dict[str, torch.Tensor] = dict()
    for concept in cargo.job.cota.concepts:
        # get the embeddings of the annotated sentences for the concept
        concept_embedding: torch.Tensor = refined_embeddings[
            annotation_indices[concept.id]
        ]
        # the concept representation is the average of all annotated concept sentences
        # TODO: normalize??
        concept_embeddings[concept.id] = concept_embedding.mean(axis=0)

    return concept_embeddings


def __compute_concept_to_sentence_similarities(
    cargo: Cargo, concept_embeddings: Dict[str, torch.Tensor]
) -> Dict[str, List[float]]:
    refined_embeddings: torch.Tensor = cargo.data[
        "refined_search_space_reduced_embeddings"
    ]
    # Dict[concept_id, List[similarity]]
    concept_similarities: Dict[str, List[float]] = dict()
    for concept in cargo.job.cota.concepts:
        concept_embedding = concept_embeddings[concept.id]
        sims = concept_embedding @ refined_embeddings.T
        # TODO: normalize?
        concept_similarities[concept.id] = sims.tolist()
    return concept_similarities


def __update_search_space_with_concept_similarities(
    cargo: Cargo, concept_similarities: Dict[str, List[float]]
) -> None:
    search_space: List[COTASentence] = cargo.data["search_space"]
    for concept_id, similarities in concept_similarities.items():
        for sentence, similarity in zip(search_space, similarities):
            sentence.concept_similarities[concept_id] = similarity


def __update_search_space_with_2D_coords(
    cargo: Cargo, visual_refined_embeddings: List[List[float]]
) -> None:
    search_space: List[COTASentence] = cargo.data["search_space"]
    for sentence, coordinates in zip(search_space, visual_refined_embeddings):
        sentence.x = coordinates[0]
        sentence.y = coordinates[1]


def add_date_to_search_space(cargo: Cargo) -> Cargo:
    # 1. read the required data
    search_space: List[COTASentence] = cargo.data["search_space"]
    sdoc_ids = [cota_sent.sdoc_id for cota_sent in search_space]

    # 2. find the date for every sdoc that is in the search space
    sdoc_id_to_date: Dict[int, datetime] = dict()

    # this is only possible if the cota has a date_metadata_id
    date_metadata_id = cargo.job.cota.timeline_settings.date_metadata_id
    if date_metadata_id is not None:
        with sqls.db_session() as db:
            query = (
                db.query(
                    SourceDocumentORM.id,
                    SourceDocumentMetadataORM.date_value,
                )
                .join(SourceDocumentORM.metadata_)
                .filter(
                    SourceDocumentORM.id.in_(sdoc_ids),
                    SourceDocumentMetadataORM.project_metadata_id == date_metadata_id,
                    SourceDocumentMetadataORM.date_value.isnot(None),
                )
            )
            result_rows = query.all()

        for row in result_rows:
            sdoc_id_to_date[row[0]] = row[1]

    # otherwise, we set the date to today for every sdoc
    else:
        for sdoc_id in sdoc_ids:
            sdoc_id_to_date[sdoc_id] = datetime.now()

    # 3. update search_space with the date
    for sentence in search_space:
        sentence.date = sdoc_id_to_date[sentence.sdoc_id]

    return cargo


def store_search_space_in_db(cargo: Cargo) -> Cargo:
    # 1. read the required data
    search_space: List[COTASentence] = cargo.data["search_space"]

    # 2. Store search_space in db
    with sqls.db_session() as db:
        cota_service.update(
            db=db,
            cota_id=cargo.job.cota.id,
            cota_update=COTAUpdate(search_space=search_space),
        )

    return cargo
