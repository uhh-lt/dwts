from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.data.dto.span_annotation import SpanAnnotationRead


# Properties shared across all DTOs
class SpanGroupBaseDTO(BaseModel):
    name: str = Field(description="Name of the SpanGroup")


# Properties for creation
class SpanGroupCreateIntern(SpanGroupBaseDTO):
    annotation_document_id: int = Field(
        description="The ID of the AnnotationDocument the SpanGroup belongs to"
    )


class SpanGroupCreate(SpanGroupBaseDTO):
    sdoc_id: int = Field(description="SourceDocument the SpanGroup refers to")


# Properties for updating
class SpanGroupUpdate(BaseModel, UpdateDTOBase):
    name: Optional[str] = Field(description="Name of the SpanGroup", default=None)


# Properties for reading (as in ORM)
class SpanGroupRead(SpanGroupBaseDTO):
    id: int = Field(description="ID of the SpanGroup")
    user_id: int = Field(description="User that created the SpanGroup")
    sdoc_id: int = Field(description="SourceDocument the SpanGroup refers to")
    created: datetime = Field(description="Created timestamp of the SpanGroup")
    updated: datetime = Field(description="Updated timestamp of the SpanGroup")
    model_config = ConfigDict(from_attributes=True)


class SpanGroupWithAnnotationsRead(SpanGroupRead):
    span_annotations: List[SpanAnnotationRead] = Field(
        description="Annotations of the SpanGroup"
    )


# To link a SpanAnnotation with a SpanGroup
class SpanAnnotationSpanGroupLink(BaseModel):
    span_annotation_id: int = Field(description="ID of the SpanAnnotation")
    span_group_id: int = Field(description="ID of the SpanGroup")
