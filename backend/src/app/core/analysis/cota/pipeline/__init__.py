from functools import lru_cache

from app.core.analysis.cota.pipeline.pipeline import COTARefinementPipeline


@lru_cache(maxsize=1)
def build_cota_refinement_pipeline(foo: str = "bar") -> COTARefinementPipeline:
    from app.core.analysis.cota.pipeline.steps.toy import (
        compute_result,
        init_or_find_concept_embedding_model,
        init_or_load_initial_search_space,
        init_or_load_search_space_reduced_embeddings,
        joy_step,
        refine_search_space_reduced_embeddings_with_cem,
        store_cota_in_db,
        toy_step,
        train_cem,
    )

    pipeline = COTARefinementPipeline()

    pipeline.register_step(init_or_load_initial_search_space, required_data=[])
    pipeline.register_step(
        init_or_load_search_space_reduced_embeddings, required_data=["search_space"]
    )
    pipeline.register_step(
        init_or_find_concept_embedding_model, required_data=["search_space"]
    )
    pipeline.register_step(train_cem, required_data=[])
    pipeline.register_step(
        refine_search_space_reduced_embeddings_with_cem, required_data=[]
    )
    pipeline.register_step(compute_result, required_data=[])
    pipeline.register_step(store_cota_in_db, required_data=[])
    pipeline.register_step(toy_step, required_data=[])
    pipeline.register_step(joy_step, required_data=["toy"])

    pipeline.freeze()

    return pipeline
