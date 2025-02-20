from langdetect import detect_langs
from loguru import logger

from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.model.text.preprotextdoc import PreProTextDoc


def detect_content_language(cargo: PipelineCargo) -> PipelineCargo:
    pptd: PreProTextDoc = cargo.data["pptd"]
    if "language" not in pptd.metadata:
        try:
            # TODO Flo: what to do with mixed lang docs?
            pptd.metadata["language"] = detect_langs(pptd.text)[0].lang
        except Exception as e:
            logger.warning(f"Cannot detect language of {pptd.filename}! {e}")
            pptd.metadata["language"] = "en"

    return cargo
