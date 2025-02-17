import logging
from typing import List, Tuple

import torch
from dto.detr import DETRFilePathInput, DETRObjectDetectionOutput, ObjectBBox
from PIL import Image
from ray import serve
from ray_config import build_ray_model_deployment_config, conf
from transformers import DetrFeatureExtractor, DetrForObjectDetection
from utils import (
    get_sdoc_path_for_project_and_sdoc_name,
)

cc = conf.detr

DEVICE = cc.device
MODEL = cc.model
CONFIDENCE_THRESHOLD = cc.object_detection.confidence_threshold
COCO_2017_LABELS = cc.object_detection.coco2017_labels

logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("detr"))
class DETRModel:
    def __init__(self):
        logger.debug(f"Loading DetrFeatureExtractor {MODEL} ...")
        feature_extractor = DetrFeatureExtractor.from_pretrained(MODEL, device=DEVICE)
        assert isinstance(feature_extractor, DetrFeatureExtractor), (
            "Failed to load feature extractor"
        )

        logger.debug(f"Loading DetrForObjectDetection {MODEL} ...")
        object_detection_model = DetrForObjectDetection.from_pretrained(MODEL)
        assert isinstance(object_detection_model, DetrForObjectDetection), (
            "Failed to load object detection model"
        )

        object_detection_model.to(DEVICE)
        object_detection_model.eval()

        self.feature_extractor = feature_extractor
        self.object_detection_model = object_detection_model

    def object_detection(self, input: DETRFilePathInput) -> DETRObjectDetectionOutput:
        with Image.open(
            get_sdoc_path_for_project_and_sdoc_name(
                proj_id=input.project_id, sdoc_name=input.image_fp
            )
        ) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            inputs = self.feature_extractor(img, return_tensors="pt").to(DEVICE)
            with torch.no_grad():
                outputs = self.object_detection_model(**inputs)
            img_size = torch.tensor([tuple(reversed(img.size))]).to(DEVICE)
            output_dict = self.feature_extractor.post_process(outputs, img_size)[0]

        # Flo: apply the confidence threshold
        keep = output_dict["scores"] > CONFIDENCE_THRESHOLD
        confidences: List[float] = output_dict["scores"][keep].tolist()
        boxes: List[Tuple[int, int, int, int]] = (
            output_dict["boxes"][keep].int().tolist()
        )
        label_ids: List[int] = output_dict["labels"][keep].tolist()
        labels: List[str] = [COCO_2017_LABELS[lid].upper() for lid in label_ids]

        bboxes: List[ObjectBBox] = []
        for (x_min, y_min, x_max, y_max), label, confidence in zip(
            boxes, labels, confidences
        ):
            bbox = ObjectBBox(
                label=label,
                x_min=x_min,
                y_min=y_min,
                x_max=x_max,
                y_max=y_max,
                confidence=confidence,
            )
            bboxes.append(bbox)

        return DETRObjectDetectionOutput(bboxes=bboxes)
