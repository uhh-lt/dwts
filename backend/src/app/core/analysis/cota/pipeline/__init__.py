from functools import lru_cache

from app.core.analysis.cota.pipeline.pipeline import COTARefinementPipeline


@lru_cache(maxsize=1)
def built_cota_refinement_pipeline(foo: str = "bar") -> COTARefinementPipeline:
    from app.core.analysis.cota.pipeline.steps.toy import joy_step, toy_step

    pipeline = COTARefinementPipeline()

    pipeline.register_step(toy_step, required_data=[])
    pipeline.register_step(joy_step, required_data=["toy"])

    pipeline.freeze()

    return pipeline
