import logging
from pathlib import Path

import torch
from dto.clip import (
    ClipEmbeddingOutput,
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from numpy import ndarray
from PIL import Image
from ray import serve
from ray_config import build_ray_model_deployment_config, conf
from sentence_transformers import SentenceTransformer
from utils import (
    get_sdoc_path_for_project_and_sdoc_name,
)

cc = conf.clip

TEXT_DEVICE = cc.text_encoder.device
IMAGE_DEVICE = cc.image_encoder.device
TEXT_MODEL = cc.text_encoder.model
IMAGE_MODEL = cc.image_encoder.model
TEXT_BATCH_SIZE = cc.text_encoder.batch_size
IMAGE_BATCH_SIZE = cc.image_encoder.batch_size

logger = logging.getLogger("ray.serve")


def load_image(img_p: str | Path) -> Image.Image:
    img = Image.open(img_p)
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img


@serve.deployment(**build_ray_model_deployment_config("clip"))
class ClipModel:
    def __init__(self):
        logger.debug(f"Loading ClipModel {TEXT_MODEL} for text ...")
        text_encoder = SentenceTransformer(TEXT_MODEL, device=TEXT_DEVICE)
        text_encoder.eval()
        self.text_encoder = text_encoder

        logger.debug(f"Loading ClipModel {IMAGE_MODEL} for image ...")
        image_encoder = SentenceTransformer(IMAGE_MODEL, device=IMAGE_DEVICE)
        image_encoder.eval()
        self.image_encoder = image_encoder

    def text_embedding(self, input: ClipTextEmbeddingInput) -> ClipEmbeddingOutput:
        with torch.no_grad():
            encoded_text = self.text_encoder.encode(
                sentences=input.text,
                batch_size=TEXT_BATCH_SIZE,
                show_progress_bar=False,
                normalize_embeddings=True,
                device=TEXT_DEVICE,
                convert_to_numpy=True,
            )
            assert isinstance(encoded_text, ndarray), "Failed to encode texts"

            return ClipEmbeddingOutput(embeddings=encoded_text.tolist())

    def image_embedding(self, input: ClipImageEmbeddingInput) -> ClipEmbeddingOutput:
        images = [
            load_image(
                get_sdoc_path_for_project_and_sdoc_name(
                    proj_id=project_id, sdoc_name=img_p
                )
            )
            for project_id, img_p in zip(input.project_ids, input.image_fps)
        ]

        with torch.no_grad():
            encoded_images = self.image_encoder.encode(
                sentences=images,  # type: ignore
                batch_size=IMAGE_BATCH_SIZE,
                show_progress_bar=False,
                normalize_embeddings=True,
                device=IMAGE_DEVICE,
                convert_to_numpy=True,
            )
            assert isinstance(encoded_images, ndarray), "Failed to encode images"

            # close the images
            for img in images:
                img.close()
            return ClipEmbeddingOutput(embeddings=encoded_images.tolist())
