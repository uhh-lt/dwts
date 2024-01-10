from typing import Dict

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.data.dto.concept_over_time_analysis import COTASentence
from app.core.data.dto.search import SimSearchQuery

SEARCH_SPACE_TOPK = 100
SEARCH_SPACE_THRESHOLD = 0.9


def init_or_load_initial_search_space(cargo: Cargo) -> Cargo:
    cota = cargo.job.cota

    # the search space is not empty, we load sentences from the cota
    if len(cota.sentence_search_space) > 0:
        cargo.data["search_space_sentence_ids"] = [
            s.sentence_id for s in cota.sentence_search_space
        ]

    # the search space is empty, we build the search space with simsearch
    else:
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
        # TODO: DB call here?

        # update the cargo with the search space
        # or: upate cargo.job.cota with search space
        cargo.data["search_space_sentence_ids"] = [
            s.sentence_id for s in search_space_sentences.values()
        ]

    return cargo


def init_or_load_search_space_reduced_embeddings(cargo: Cargo) -> Cargo:
    # TODO: check if the reduced embeddings are stored on the file system
    # if stored_on_file_system:
    #     load_from_file_system()
    #     cargo.data["search_space_reduced_embeddings"] = ...
    # else:

    # 1. Get the embeddings for the search space sentences from weaviate
    import numpy as np

    from app.core.search.simsearch_service import SimSearchService

    sims: SimSearchService = SimSearchService()
    search_space_embeddings_dict = sims.get_sentence_embeddings(
        sentence_ids=cargo.data["search_space_sentence_ids"]
    )
    search_space_embeddings = np.array(list(search_space_embeddings_dict.values()))

    # 2. Reduce the embeddings with UMAP (or do we want to use PCA here?)
    # conda install -c conda-forge umap-learn
    import umap

    reducer = umap.UMAP()
    search_space_reduced_embeddings = reducer.fit_transform(search_space_embeddings)

    # 3. Store the reduced embeddings on the file system
    # store_reduced_embeddings_in_file_system(cargo.job.cota.id, search_space_reduced_embeddings)

    return cargo


def init_or_find_concept_embedding_model(cargo: Cargo) -> Cargo:
    # TODO: check if the reduced embeddings are stored on the file system
    # if not cem_exists_in_file_system(cargo.job.cota.id):

    # 1. Define model
    # model = ...

    # 2. Store model
    # store_cem_in-file_system(cargo.job.cota.id, model)

    return cargo


def train_cem(cargo: Cargo) -> Cargo:
    # Only train if we have enough annotated data
    # for concept in cargo.job.cota.concepts:
    # TODO: COTAConcept needs a field for storing annotations
    # if len(concept.sentence_annotations) < 100:
    #     return cargo

    # 1. Create the training data

    # TODO: Wollen wir wirklich den Trainer Service nehmen, oder einfach hier in der Pipeline trainieren?
    # 2. Start the training job with TrainerService

    # 3. Wait for the training job to finish

    return cargo


def refine_search_space_reduced_embeddings_with_cem(cargo: Cargo) -> Cargo:
    # 1. Load the CEM
    # model = load_cem_from_file_system(cargo.job.cota.id)

    # 2. Load the reduced embeddings
    # reduced_embeddings = load_reduced_embeddings_from_file_system(cargo.job.cota.id)

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
