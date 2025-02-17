from datetime import datetime
from typing import Dict, List

from pydantic import BaseModel, ConfigDict, Field

from .dto_base import UpdateDTOBase


# Properties shared across all DTOs
class SentenceAnnotationBaseDTO(BaseModel):
    sentence_id_start: int = Field(
        description="Start sentence ID of the SentenceAnnotation"
    )
    sentence_id_end: int = Field(
        description="End sentence ID of the SentenceAnnotation"
    )


# Properties for creation
class SentenceAnnotationCreateIntern(SentenceAnnotationBaseDTO):
    code_id: int = Field(description="Code the SentenceAnnotation refers to")
    annotation_document_id: int = Field(
        description="AnnotationDocument the SentenceAnnotation refers to"
    )


class SentenceAnnotationCreate(SentenceAnnotationBaseDTO):
    code_id: int = Field(description="Code the SentenceAnnotation refers to")
    sdoc_id: int = Field(description="SourceDocument the SentenceAnnotation refers to")


# Properties for updating
class SentenceAnnotationUpdate(BaseModel, UpdateDTOBase):
    code_id: int = Field(description="Code the SentenceAnnotation refers to")


class SentenceAnnotationUpdateBulk(BaseModel, UpdateDTOBase):
    sent_annotation_id: int = Field(description="ID of the SentenceAnnotation")
    code_id: int = Field(description="Code the SentenceAnnotation refers to")


# Properties for reading (as in ORM)
class SentenceAnnotationRead(SentenceAnnotationBaseDTO):
    id: int = Field(description="ID of the SentenceAnnotation")
    code_id: int = Field(description="Code the SentenceAnnotation refers to")
    user_id: int = Field(description="User that created the SentenceAnnotation")
    sdoc_id: int = Field(description="SourceDocument the SentenceAnnotation refers to")
    created: datetime = Field(description="Created timestamp of the SentenceAnnotation")
    updated: datetime = Field(description="Updated timestamp of the SentenceAnnotation")
    model_config = ConfigDict(from_attributes=True)


class SentenceAnnotatorResult(BaseModel):
    sentence_annotations: Dict[int, List[SentenceAnnotationRead]] = Field(
        description="A mapping of sentence IDs to their annotations"
    )
