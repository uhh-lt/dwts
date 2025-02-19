from typing import Any, Dict, List

import requests
from loguru import logger
from requests import Response

from app.preprocessing.ray_model_worker.dto.blip2 import Blip2FilePathInput, Blip2Output
from app.preprocessing.ray_model_worker.dto.clip import (
    ClipEmbeddingOutput,
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from app.preprocessing.ray_model_worker.dto.cota import (
    RayCOTAJobInput,
    RayCOTAJobResponse,
)
from app.preprocessing.ray_model_worker.dto.detr import (
    DETRFilePathInput,
    DETRObjectDetectionOutput,
)
from app.preprocessing.ray_model_worker.dto.quote import QuoteJobInput, QuoteJobOutput
from app.preprocessing.ray_model_worker.dto.seqsenttagger import (
    SeqSentTaggerJobInput,
    SeqSentTaggerJobResponse,
)
from app.preprocessing.ray_model_worker.dto.spacy import SpacyInput, SpacyPipelineOutput
from app.preprocessing.ray_model_worker.dto.whisper import (
    WhisperFilePathInput,
    WhisperTranscriptionOutput,
)
from app.util.singleton_meta import SingletonMeta
from config import conf


class RayModelService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.base_url = f"{conf.ray.protocol}://{conf.ray.host}:{conf.ray.port}"
        logger.info(f"RayModelService base_url: {cls.base_url}")

        try:
            response = requests.get(f"{cls.base_url}/-/routes")
            if not response.status_code == 200:
                msg = (
                    f"Request to {cls.base_url} failed with "
                    f"status code {response.status_code}!\n"
                    f"Response: {response.text}!"
                )
                logger.error(msg)
                raise Exception(msg)

            cls.base_routes: List[str] = list(response.json().keys())
            logger.info(
                f"RayModelService detected the following base routes:"
                f"\n{cls.base_routes}"
            )

        except Exception as e:
            msg = f"Error while starting the RayModelService! Exception: {str(e)}"
            logger.error(msg)
            raise SystemExit(msg)

        return super(RayModelService, cls).__new__(cls)

    def _assert_valid_base_route(self, endpoint: str) -> None:
        for br in self.base_routes:
            if endpoint.startswith(br):
                return
        msg = (
            f"Invalid endpoint '{endpoint}'! "
            f"Must start with one of the following base routes: {self.base_routes}"
        )
        logger.error(msg)
        raise Exception(msg)

    def _make_post_request(self, endpoint: str, data: Dict[str, Any]) -> Response:
        url = f"{self.base_url}{endpoint}"
        logger.debug(f"Making POST request to {url} with data: {data}"[:1000])
        response = requests.post(url, json=data, timeout=1200)
        if not response.status_code == 200:
            msg = (
                f"Request to {url} failed with "
                f"status code {response.status_code}!\n"
                f"Response: {response.text}!"
            )
            logger.error(msg)
            raise Exception(msg)
        return response

    def spacy_pipline(self, input: SpacyInput) -> SpacyPipelineOutput:
        response = self._make_post_request("/spacy/pipeline", input.model_dump())
        return SpacyPipelineOutput.model_validate(response.json())

    def whisper_transcribe(
        self, input: WhisperFilePathInput
    ) -> WhisperTranscriptionOutput:
        response = self._make_post_request("/whisper/transcribe", input.model_dump())
        return WhisperTranscriptionOutput.model_validate(response.json())

    def detr_object_detection(
        self, input: DETRFilePathInput
    ) -> DETRObjectDetectionOutput:
        response = self._make_post_request("/detr/object_detection", input.model_dump())
        return DETRObjectDetectionOutput.model_validate(response.json())

    def blip2_image_captioning(self, input: Blip2FilePathInput) -> Blip2Output:
        response = self._make_post_request(
            "/blip2/image_captioning", input.model_dump()
        )
        return Blip2Output.model_validate(response.json())

    def clip_text_embedding(self, input: ClipTextEmbeddingInput) -> ClipEmbeddingOutput:
        response = self._make_post_request("/clip/embedding/text", input.model_dump())
        return ClipEmbeddingOutput.model_validate(response.json())

    def clip_image_embedding(
        self, input: ClipImageEmbeddingInput
    ) -> ClipEmbeddingOutput:
        response = self._make_post_request("/clip/embedding/image", input.model_dump())
        return ClipEmbeddingOutput.model_validate(response.json())

    def cota_finetune_apply_compute(self, input: RayCOTAJobInput) -> RayCOTAJobResponse:
        response = self._make_post_request(
            "/cota/finetune_apply_compute", input.model_dump()
        )
        return RayCOTAJobResponse.model_validate(response.json())

    def seqsenttagger_train_apply(
        self, input: SeqSentTaggerJobInput
    ) -> SeqSentTaggerJobResponse:
        response = self._make_post_request(
            "/seqsenttagger/train_apply", input.model_dump()
        )
        return SeqSentTaggerJobResponse.model_validate(response.json())

    def quote_prediction(self, input: QuoteJobInput) -> QuoteJobOutput:
        response = self._make_post_request("/quote/predict", input.model_dump())
        return QuoteJobOutput.model_validate(response.json())
