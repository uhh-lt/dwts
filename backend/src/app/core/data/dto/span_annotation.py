from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field

from .dto_base import UpdateDTOBase


# Properties shared across all DTOs
class SpanAnnotationBaseDTO(BaseModel):
    begin: int = Field(description="Begin of the SpanAnnotation in characters")
    end: int = Field(description="End of the SpanAnnotation in characters")
    begin_token: int = Field(description="Begin of the SpanAnnotation in tokens")
    end_token: int = Field(description="End of the SpanAnnotation in tokens")


# Properties for creation
class SpanAnnotationCreateIntern(SpanAnnotationBaseDTO):
    span_text: str = Field(description="The SpanText the SpanAnnotation spans.")
    code_id: int = Field(description="Code the SpanAnnotation refers to")
    annotation_document_id: int = Field(
        description="AnnotationDocument the SpanAnnotation refers to"
    )


class SpanAnnotationCreate(SpanAnnotationBaseDTO):
    span_text: str = Field(description="The SpanText the SpanAnnotation spans.")
    code_id: int = Field(description="Code the SpanAnnotation refers to")
    sdoc_id: int = Field(description="SourceDocument the SpanAnnotation refers to")


# Properties for updating
class SpanAnnotationUpdate(BaseModel, UpdateDTOBase):
    code_id: int = Field(description="Code the SpanAnnotation refers to")


class SpanAnnotationUpdateBulk(BaseModel, UpdateDTOBase):
    span_annotation_id: int = Field(description="ID of the SpanAnnotation")
    code_id: int = Field(description="Code the SpanAnnotation refers to")


# Properties for reading (as in ORM)
class SpanAnnotationRead(SpanAnnotationBaseDTO):
    id: int = Field(description="ID of the SpanAnnotation")
    text: str = Field(description="The SpanText the SpanAnnotation spans.")
    code_id: int = Field(description="Code the SpanAnnotation refers to")
    user_id: int = Field(description="User the SpanAnnotation belongs to")
    sdoc_id: int = Field(description="SourceDocument the SpanAnnotation refers to")
    created: datetime = Field(description="Created timestamp of the SpanAnnotation")
    updated: datetime = Field(description="Updated timestamp of the SpanAnnotation")
    group_ids: List[int] = Field(
        description="The group ids this span annotations belongs to"
    )
    model_config = ConfigDict(from_attributes=True)


class SpanAnnotationDeleted(SpanAnnotationBaseDTO):
    id: int = Field(description="ID of the SpanAnnotation")
    code_id: int = Field(description="Code the SpanAnnotation refers to")
    user_id: int = Field(description="User the SpanAnnotation belongs to")
    sdoc_id: int = Field(description="SourceDocument the SpanAnnotation refers to")
    created: datetime = Field(description="Created timestamp of the SpanAnnotation")
    updated: datetime = Field(description="Updated timestamp of the SpanAnnotation")
    model_config = ConfigDict(from_attributes=True)
