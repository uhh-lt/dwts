from functools import lru_cache

from app.core.analysis.cota.pipeline.pipeline import COTARefinementPipeline


@lru_cache(maxsize=1)
def build_cota_refinement_pipeline(foo: str = "bar") -> COTARefinementPipeline:
    from app.core.analysis.cota.pipeline.steps.apply_st import apply_st
    from app.core.analysis.cota.pipeline.steps.compute_results import compute_results
    from app.core.analysis.cota.pipeline.steps.finetune_st import finetune_st
    from app.core.analysis.cota.pipeline.steps.init_search_space import (
        init_search_space,
    )
    from app.core.analysis.cota.pipeline.steps.store_in_db import store_in_db

    pipeline = COTARefinementPipeline()

    pipeline.register_step(
        init_search_space,
        required_data=[],
    )
    pipeline.register_step(
        finetune_st,
        required_data=["search_space"],
    )
    pipeline.register_step(
        apply_st,
        required_data=["search_space"],
    )
    pipeline.register_step(
        compute_results,
        required_data=[
            "search_space",
            "search_space_embeddings",
            "concept_probabilities",
        ],
    )
    pipeline.register_step(
        store_in_db,
        required_data=["search_space"],
    )

    # OLD PIPELINE
    # pipeline.register_step(
    #     init_or_load_initial_search_space,
    #     required_data=[],
    # )
    # pipeline.register_step(
    #     init_search_space_reduced_embeddings,
    #     required_data=["search_space"],
    # )
    # pipeline.register_step(
    #     init_concept_embedding_model,
    #     required_data=[],
    # )
    # pipeline.register_step(
    #     train_cem,
    #     required_data=[],
    # )
    # pipeline.register_step(
    #     refine_search_space_reduced_embeddings_with_cem,
    #     required_data=[],
    # )
    # pipeline.register_step(
    #     compute_result,
    #     required_data=[
    #         "search_space",
    #         "refined_search_space_reduced_embeddings",
    #     ],
    # )
    # pipeline.register_step(
    #     add_date_to_search_space,
    #     required_data=["search_space"],
    # )
    # pipeline.register_step(
    #     store_search_space_in_db,
    #     required_data=["search_space"],
    # )

    pipeline.freeze()

    return pipeline
