from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .dto_base import UpdateDTOBase


class SourceDocumentJobBaseDTO(BaseModel):
    id: int = Field(description="ID of the SourceDocument")
    quotation_attribution_at: Optional[datetime] = Field(
        description="timestamp when quotation attribution was performed on this document"
    )


class SourceDocumentJobRead(SourceDocumentJobBaseDTO):
    id: int = Field(description="ID of the SourceDocument")
    model_config = ConfigDict(from_attributes=True)


class SourceDocumentJobCreate(SourceDocumentJobBaseDTO):
    pass

class SourceDocumentJobUpdate(SourceDocumentJobBaseDTO, UpdateDTOBase):
    pass