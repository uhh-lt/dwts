import sys
from typing import Any, Dict, List

import requests
from app.preprocessing.ray_model_worker.dto.blip2 import Blip2FilePathInput, Blip2Output
from app.preprocessing.ray_model_worker.dto.clip import (
    ClipEmbeddingOutput,
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from app.preprocessing.ray_model_worker.dto.detr import (
    DETRFilePathInput,
    DETRObjectDetectionOutput,
)
from app.preprocessing.ray_model_worker.dto.spacy import SpacyInput, SpacyPipelineOutput
from app.preprocessing.ray_model_worker.dto.vit_gpt2 import (
    ViTGPT2FilePathInput,
    ViTGPT2Output,
)
from app.preprocessing.ray_model_worker.dto.whisper import (
    WhisperFilePathInput,
    WhisperTranscriptionOutput,
)
from app.util.singleton_meta import SingletonMeta
from config import conf
from loguru import logger
from requests import Response


class RayModelService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        running_in_test = hasattr(sys, "_called_from_test")
        if running_in_test:
            # When running in tests, don't use the ray service at all
            return super(RayModelService, cls).__new__(cls)

        cls.base_url = f"{conf.ray.protocol}://" f"{conf.ray.host}:" f"{conf.ray.port}"
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
        logger.debug(f"Making POST request to {url} with data: {data}")
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
        response = self._make_post_request("/spacy/pipeline", input.dict())
        return SpacyPipelineOutput.parse_obj(response.json())

    def whisper_transcribe(
        self, input: WhisperFilePathInput
    ) -> WhisperTranscriptionOutput:
        response = self._make_post_request("/whisper/transcribe", input.dict())
        return WhisperTranscriptionOutput.parse_obj(response.json())

    def detr_object_detection(
        self, input: DETRFilePathInput
    ) -> DETRObjectDetectionOutput:
        response = self._make_post_request("/detr/object_detection", input.dict())
        return DETRObjectDetectionOutput.parse_obj(response.json())

    def vit_gpt2_image_captioning(self, input: ViTGPT2FilePathInput) -> ViTGPT2Output:
        raise NotImplementedError
        response = self._make_post_request("/vit_gpt2/image_captioning", input.dict())
        return ViTGPT2Output.parse_obj(response.json())

    def blip2_image_captioning(self, input: Blip2FilePathInput) -> Blip2Output:
        response = self._make_post_request("/blip2/image_captioning", input.dict())
        return Blip2Output.parse_obj(response.json())

    def clip_text_embedding(self, input: ClipTextEmbeddingInput) -> ClipEmbeddingOutput:
        response = self._make_post_request("/clip/embedding/text", input.dict())
        return ClipEmbeddingOutput.parse_obj(response.json())

    def clip_image_embedding(
        self, input: ClipImageEmbeddingInput
    ) -> ClipEmbeddingOutput:
        response = self._make_post_request("/clip/embedding/image", input.dict())
        return ClipEmbeddingOutput.parse_obj(response.json())
