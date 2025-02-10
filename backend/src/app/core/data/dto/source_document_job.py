from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.data.dto.dto_base import UpdateDTOBase


class SourceDocumentJobBaseDTO(BaseModel):
    quotation_attribution_at: Optional[datetime] = Field(
        description="timestamp when quotation attribution was performed on this document"
    )


class SourceDocumentJobRead(SourceDocumentJobBaseDTO):
    id: int = Field(description="ID of the SourceDocument")
    model_config = ConfigDict(from_attributes=True)


class SourceDocumentJobCreate(SourceDocumentJobBaseDTO):
    pass


class SourceDocumentJobUpdate(SourceDocumentJobBaseDTO, UpdateDTOBase):
    id: int = Field(description="ID of the SourceDocument")
