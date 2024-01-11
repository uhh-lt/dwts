import time
from typing import Dict

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.concept_over_time_analysis import COTASentence
from app.core.data.dto.search import SimSearchQuery
from app.core.data.dto.trainer_job import TrainerJobParameters

SEARCH_SPACE_TOPK = 100
SEARCH_SPACE_THRESHOLD = 0.9
MIN_CONCEPT_SENTENCE_ANNOTATIONS = 5


def init_or_load_initial_search_space(cargo: Cargo) -> Cargo:
    cota = cargo.job.cota

    # the search space is not empty, we dont need to do anything
    if len(cota.sentence_search_space) > 0:
        return cargo
    
    # the search space is empty, we build the search space with simsearch
    from app.core.search.simsearch_service import SimSearchService

    sims: SimSearchService = SimSearchService()

    search_space_sentences: Dict[int, COTASentence] = dict()
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
        search_space_sentences.update(
            {
                sent.sentence_id: COTASentence(
                    sentence_id=sent.sentence_id,
                    sdoc_id=sent.sdoc_id,
                )
                for sent in sents
            }
        )

    # update the cota with the search space
    cargo.job.cota.sentence_search_space = list(search_space_sentences.values())

    return cargo


def init_or_load_search_space_reduced_embeddings(cargo: Cargo) -> Cargo:
    import numpy as np
    import umap

    from app.core.data.repo.repo_service import RepoService
    from app.core.search.simsearch_service import SimSearchService

    repo: RepoService = RepoService()
    sims: SimSearchService = SimSearchService()

    # if the embeddings exists, we dont need to do anything
    if repo.embedding_exists(proj_id=cargo.job.cota.project_id, embedding_name=str(cargo.job.cota.id)):
        return cargo

    # 1. Get the embeddings for the search space sentences from weaviate
    sentence_search_space_ids = [cota_sent.sentence_id for cota_sent in cargo.job.cota.sentence_search_space]
    search_space_embeddings_dict = sims.get_sentence_embeddings(
        sentence_ids=sentence_search_space_ids
    )
    search_space_embeddings = np.array(list(search_space_embeddings_dict.values()))

    # 2. Reduce the embeddings with UMAP (or do we want to use PCA here?)
    reducer = umap.UMAP()
    search_space_reduced_embeddings = reducer.fit_transform(search_space_embeddings)

    # 3. Store the reduced embeddings on the file system
    embedding_path = repo.get_embedding_path(proj_id=cargo.job.cota.project_id, embedding_name=str(cargo.job.cota.id))
    np.save(embedding_path, search_space_reduced_embeddings)

    return cargo


# probably this step is not needed?
def init_or_find_concept_embedding_model(cargo: Cargo) -> Cargo:
    from app.core.data.repo.repo_service import RepoService
    from app.trainer.trainer_service import TrainerService

    repo: RepoService = RepoService()
    trainer: TrainerService = TrainerService()

    # if the model exists, we dont need to do anything
    if repo.trained_model_exists(proj_id=cargo.job.cota.project_id, model_name=str(cargo.job.cota.id)):
        return cargo

    # 1. Define model
    model = trainer.__create_probing_layers_network(num_layers=5, input_dim=64, hidden_dim=64, output_dim=64)

    # 2. Store model
    model_path = repo.get_trained_model_path(proj_id=cargo.job.cota.project_id, model_name=str(cargo.job.cota.id))
    model.save(model_path)

    return cargo


def train_cem(cargo: Cargo) -> Cargo:
    from app.core.db.redis_service import RedisService
    from app.core.db.sql_service import SQLService
    from app.trainer.trainer_service import TrainerService

    trainer: TrainerService = TrainerService()
    sqls: SQLService = SQLService()
    redis: RedisService = RedisService()

    # Only train if we have enough annotated data
    for concept in cargo.job.cota.concepts:
        if len(concept.sentence_annotations) < MIN_CONCEPT_SENTENCE_ANNOTATIONS:
            return cargo

    # 1. Create the training data

    # TODO: Wollen wir wirklich den Trainer Service nehmen, oder einfach hier in der Pipeline trainieren?
    # 2. Start the training job with TrainerService
    with sqls.db_session() as db:
        tj = trainer.create_and_start_trainer_job_async(db=db, trainer_params=TrainerJobParameters(
            project_id=cargo.job.cota.project_id,
            new_model_name=str(cargo.job.cota.id)
        ))

    # 3. Wait for the training job to finish
    # TODO: So? ist das schlau?
    while tj.status == BackgroundJobStatus.RUNNING or tj.status == BackgroundJobStatus.WAITING:
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
    import numpy as np
    import torch

    from app.core.data.repo.repo_service import RepoService

    repo: RepoService = RepoService()

    # 1. Load the CEM
    model_path = repo.get_trained_model_path(proj_id=cargo.job.cota.project_id, model_name=str(cargo.job.cota.id))
    model = torch.load(model_path)

    # 2. Load the reduced embeddings
    embedding_path = repo.get_embedding_path(proj_id=cargo.job.cota.project_id, embedding_name=str(cargo.job.cota.id))
    reduced_embeddings = np.load(embedding_path)

    # 2. Refine the search space reduced embeddings with the CEM
    # refined_embeddings = model.predict(reduced_embeddings)

    # 3. Update cargo with the refined search space reduced embeddings
    # cargo.data["refined_search_space_reduced_embeddings"] = refined_embeddings

    return cargo


def compute_result(cargo: Cargo) -> Cargo:
    # ich würde in diesem vorletzen Schritt alle ergebnissberechnungen machen

    # 1. read the refined search space reduced embeddings
    # refined_embeddings = cargo.data["refined_search_space_reduced_embeddings"]

    # 2. compute average representation for each concept
    # average_concept_embeddings = dict()
    # for concept in cargo.job.cota.concepts:
    #     average_concept_embeddings[concept.id] = np.mean()

    # 3. Rank sentence for each concept: compute similarity of average representation to each sentence

    # 4. Visualize results: Reduce the refined embeddings with UMAP to 2D

    return cargo


def store_cota_in_db(cargo: Cargo) -> Cargo:
    # Hier im letzen Schritt würde ich alle ergebnisse in das COTA Objekt schreiben und in die DB speichern
    # Dazu gehört

    # Es ist wichtig, dass alles in der DB steht, damit bei einem Reload der Seite nicht alles neuberechnet werden muss.

    # 1. search_space_sentenes (mit text str und referenz zu sdoc)
    # 2. similarity scores: das Ranking der Sätze für jedes Konzept
    # 3. visualisierung: die 2D coords für die sätze

    # Sobald die Pipeline durchgelaufen ist, muss eigentlich nur das COTA Objekt aus der DB geladen werden, dann kann im Frontend alles gerendert werden.

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
