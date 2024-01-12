import time
from typing import Dict, List

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.concept_over_time_analysis import COTASentence, COTAUpdate
from app.core.data.dto.search import SimSearchQuery
from app.core.data.dto.trainer_job import TrainerJobParameters

SEARCH_SPACE_TOPK = 1000
SEARCH_SPACE_THRESHOLD = 0.0001
MIN_CONCEPT_SENTENCE_ANNOTATIONS = 5
UMAP_DIMENSIONS = 64


def init_or_load_initial_search_space(cargo: Cargo) -> Cargo:
    cota = cargo.job.cota

    # the search space is not empty, we dont need to do anything
    if len(cota.search_space) > 0:
        cargo.data["search_space"] = cota.search_space
        cargo.data["concept_similarities"] = {
            concept.id: concept.search_space_similarity_scores
            for concept in cota.concepts
        }
        return cargo

    from app.core.search.simsearch_service import SimSearchService

    sims: SimSearchService = SimSearchService()

    # the search space is empty, we build the search space with simsearch
    search_space_sentences: Dict[str, COTASentence] = dict()
    similarity_search_results: Dict[str, Dict[str, float]] = dict()
    for concept in cota.concepts:
        # find similar sentences for each concept to define search space
        sents = sims.find_similar_sentences(
            query=SimSearchQuery(
                proj_id=cota.project_id,
                query=concept.description,
                top_k=SEARCH_SPACE_TOPK,
                threshold=SEARCH_SPACE_THRESHOLD,
            )
        )

        # store the similarity search results
        similarities_dict: Dict[str, float] = dict()
        for sent in sents:
            similarities_dict[f"{sent.sentence_id}-{sent.sdoc_id}"] = sent.score
        similarity_search_results[concept.id] = similarities_dict

        # we use a dict here to prevent duplicates in the search space
        search_space_sentences.update(
            {
                f"{sent.sentence_id}-{sent.sdoc_id}": COTASentence(
                    sentence_id=sent.sentence_id,
                    sdoc_id=sent.sdoc_id,
                )
                for sent in sents
            }
        )

    # update the cota with the search space
    search_space = list(search_space_sentences.values())
    cargo.data["search_space"] = search_space

    # assign the similarity search similarities to the search space
    # for each concept, we go through the search space and assign the similarity score of the sim search
    concept_similarities: Dict[str, List[float]] = dict()
    for concept in cargo.job.cota.concepts:
        similarity_search_result = similarity_search_results[concept.id]
        concept_similarity: List[float] = [0.0 for _ in range(len(search_space))]

        for search_space_sentence in search_space:
            key = f"{search_space_sentence.sentence_id}-{search_space_sentence.sdoc_id}"
            concept_similarity.append(similarity_search_result[key])

        concept_similarities[concept.id] = concept_similarity

    cargo.data["concept_similarities"] = concept_similarities

    return cargo


def init_or_load_search_space_reduced_embeddings(cargo: Cargo) -> Cargo:
    import numpy as np
    import torch
    import umap

    from app.core.data.repo.repo_service import RepoService
    from app.core.search.simsearch_service import SimSearchService

    repo: RepoService = RepoService()
    sims: SimSearchService = SimSearchService()

    # if the embeddings exists, we dont need to do anything
    if repo.embedding_exists(
        proj_id=cargo.job.cota.project_id, embedding_name=str(cargo.job.cota.id)
    ):
        return cargo

    # if the search space is empty, we cannot compute reduced embeddings
    if len(cargo.data["search_space"]) == 0:
        search_space_reduced_embeddings = np.array([])
    else:
        # 1. Get the embeddings for the search space sentences from weaviate
        search_space_embeddings_list = sims.get_sentence_embeddings(
            search_tuples=[
                (cota_sent.sentence_id, cota_sent.sdoc_id)
                for cota_sent in cargo.data["search_space"]
            ]
        )
        # TODO: Kann man die Embeddings einfach nehmen? Ist die Reihnfolge der Embeddings gleich der Reihenfolge der COTASentences?
        # Könnte eine Ursache für Bugs sein!
        search_space_embeddings = np.array(search_space_embeddings_list)
        # 2. Reduce the embeddings with UMAP (or do we want to use PCA here?)
        reducer = umap.UMAP(n_components=UMAP_DIMENSIONS)
        search_space_reduced_embeddings = reducer.fit_transform(search_space_embeddings)

    # 3. Store the reduced embeddings on the file system
    embedding_path = repo.get_embedding_path(
        proj_id=cargo.job.cota.project_id, embedding_name=str(cargo.job.cota.id)
    )
    torch.save(torch.from_numpy(search_space_reduced_embeddings), embedding_path)

    return cargo


def init_or_find_concept_embedding_model(cargo: Cargo) -> Cargo:
    import torch

    from app.core.data.repo.repo_service import RepoService
    from app.trainer.trainer_service import TrainerService

    repo: RepoService = RepoService()
    trainer: TrainerService = TrainerService()

    # if the model exists, we dont need to do anything
    if repo.model_exists(
        proj_id=cargo.job.cota.project_id, model_name=str(cargo.job.cota.id)
    ):
        return cargo

    # We dont need to create a model, if no annotations exist, because we can't train it anyway
    for concept in cargo.job.cota.concepts:
        if len(concept.sentence_annotations) < MIN_CONCEPT_SENTENCE_ANNOTATIONS:
            return cargo

    # 1. Define model
    model = trainer._create_probing_layers_network(
        num_layers=5, input_dim=64, hidden_dim=64, output_dim=64
    )

    # 2. Store model
    model_path = repo.get_model_path(
        proj_id=cargo.job.cota.project_id, model_name=str(cargo.job.cota.id)
    )
    torch.save(model, model_path)

    return cargo


def train_cem(cargo: Cargo) -> Cargo:
    from app.core.data.repo.repo_service import RepoService
    from app.core.db.redis_service import RedisService
    from app.core.db.sql_service import SQLService
    from app.trainer.trainer_service import TrainerService

    trainer: TrainerService = TrainerService()
    sqls: SQLService = SQLService()
    redis: RedisService = RedisService()
    repo: RepoService = RepoService()

    # Only train if we have a model (that means, if we have annotations)
    if not repo.model_exists(
        proj_id=cargo.job.cota.project_id, model_name=str(cargo.job.cota.id)
    ):
        return cargo

    # (eigentlich unnötige Bedingung?) Only train if we have enough annotated data
    for concept in cargo.job.cota.concepts:
        if len(concept.sentence_annotations) < MIN_CONCEPT_SENTENCE_ANNOTATIONS:
            return cargo

    # 1. Create the training data

    # TODO: Wollen wir wirklich den Trainer Service nehmen, oder einfach hier in der Pipeline trainieren?
    # 2. Start the training job with TrainerService
    with sqls.db_session() as db:
        tj = trainer.create_and_start_trainer_job_async(
            db=db,
            trainer_params=TrainerJobParameters(
                project_id=cargo.job.cota.project_id,
                new_model_name=str(cargo.job.cota.id),
            ),
        )

    # 3. Wait for the training job to finish
    # TODO: So? ist das schlau?
    while (
        tj.status == BackgroundJobStatus.RUNNING
        or tj.status == BackgroundJobStatus.WAITING
    ):
        tj = redis.load_trainer_job(tj.id)
        time.sleep(3)

    if tj.status == BackgroundJobStatus.FINISHED:
        return cargo
    # ABORTED, ERROR
    else:
        # TODO: What to do?
        raise Exception("Training of CEM failed!")

    return cargo


def refine_search_space_reduced_embeddings_with_cem(cargo: Cargo) -> Cargo:
    import torch

    from app.core.data.repo.repo_service import RepoService

    repo: RepoService = RepoService()

    # 1. Load the reduced embeddings
    embedding_path = repo.get_embedding_path(
        proj_id=cargo.job.cota.project_id, embedding_name=str(cargo.job.cota.id)
    )
    reduced_embeddings = torch.load(embedding_path)

    # if no model exists, the refined embeddings are the reduced embeddings
    if not repo.model_exists(
        proj_id=cargo.job.cota.project_id, model_name=str(cargo.job.cota.id)
    ):
        refined_embeddings = reduced_embeddings
    else:
        # 1. Load the CEM
        model_path = repo.get_model_path(
            proj_id=cargo.job.cota.project_id, model_name=str(cargo.job.cota.id)
        )
        model = torch.load(model_path)

        # 2. Refine the search space reduced embeddings with the CEM
        refined_embeddings = model(reduced_embeddings)

    # # Overwrite Embeddings? R
    # torch.save(refined_embeddings, embedding_path)

    # 4. Update cargo with the refined search space reduced embeddings
    # Not necessary?
    cargo.data["refined_search_space_reduced_embeddings"] = refined_embeddings

    return cargo


def compute_result(cargo: Cargo) -> Cargo:
    import umap
    # from app.core.data.repo.repo_service import RepoService

    # repo: RepoService = RepoService()

    # ich würde in diesem vorletzen Schritt alle ergebnissberechnungen machen

    # 1. read the refined search space reduced embeddings
    # embedding_path = repo.get_embedding_path(
    #     proj_id=cargo.job.cota.project_id, embedding_name=str(cargo.job.cota.id)
    # )
    # refined_embeddings = torch.load(embedding_path)
    refined_embeddings = cargo.data["refined_search_space_reduced_embeddings"]

    # 2. rank search space sentences for each concept
    # this can only be done if a concept has sentence annotations, because we need those to compute the concept representation
    # if we do not have sentence annotations, the ranking / similarities were already computed by the initial simsearch (in the first step)
    do_ranking = True
    for concept in cargo.job.cota.concepts:
        if len(concept.sentence_annotations) < MIN_CONCEPT_SENTENCE_ANNOTATIONS:
            do_ranking = False
            break

    if do_ranking:
        # 2.1 compute representation for each concept
        concept_embeddings = dict()
        for concept in cargo.job.cota.concepts:
            # find embeddings of annotated sentences
            concept_embedding_idx = []
            for annotation in concept.sentence_annotations:
                embedding_idx = cargo.data["search_space"].index(annotation)
                concept_embedding_idx.append(embedding_idx)
            concept_embedding = refined_embeddings[concept_embedding_idx]

            # the concept representation is the average of all annotated concept sentences
            concept_embedding = concept_embedding.mean(axis=0)
            concept_embeddings[concept.id] = concept_embedding

        # 2.2  compute similarity of average representation to each sentence
        concept_similarities = dict()
        for concept in cargo.job.cota.concepts:
            concept_embedding = concept_embeddings[concept.id]
            sims = concept_embedding @ refined_embeddings.T
            concept_similarities[concept.id] = sims.tolist()

        cargo.data["concept_similarities"] = concept_similarities

    # 3. Visualize results: Reduce the refined embeddings with UMAP to 2D
    reducer = umap.UMAP(n_components=2)
    visual_refined_embeddings = reducer.fit_transform(refined_embeddings.numpy())
    cargo.data["visual_refined_embeddings"] = visual_refined_embeddings

    return cargo


def store_cota_in_db(cargo: Cargo) -> Cargo:
    from app.core.analysis.cota.service import COTAService
    from app.core.db.sql_service import SQLService

    cota_service: COTAService = COTAService()
    sqls: SQLService = SQLService()

    # Store pipeline results in the DB
    # 1. search_space
    # 2. concept similarity scores: the ranking of the search_space sentences for each concept
    # 3. search_space_coordinates: die 2D coords für die sätze

    # store concept similarity scores
    updated_concepts = cargo.job.cota.concepts
    for concept in updated_concepts:
        concept.search_space_similarity_scores = cargo.data["concept_similarities"][
            concept.id
        ]

    with sqls.db_session() as db:
        cota_service.update(
            db=db,
            cota_id=cargo.job.cota.id,
            cota_update=COTAUpdate(
                concepts=updated_concepts,
                search_space=cargo.data["search_space"],  # store search_space
                search_space_coordinates=cargo.data[  # store search_space_coordinates
                    "visual_refined_embeddings"
                ].tolist(),
            ),
        )

    return cargo


def toy_step(cargo: Cargo) -> Cargo:
    cargo.data["toy"] = "Hello World!"

    return cargo


def joy_step(cargo: Cargo) -> Cargo:
    toy = cargo.data["toy"]
    print(toy)
    cargo.data["joy"] = "Hello Universe!"

    print(cargo.job.cota.name)

    return cargo
