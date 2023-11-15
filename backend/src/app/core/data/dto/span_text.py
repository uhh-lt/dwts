from pydantic import BaseModel, ConfigDict, Field


# Properties shared across all DTOs
class SpanTextBaseDTO(BaseModel):
    text: str = Field(description="Code of the SpanText", default=None)


# Properties for creation
class SpanTextCreate(SpanTextBaseDTO):
    pass


# Properties for reading (as in ORM)
class SpanTextRead(SpanTextBaseDTO):
    id: int = Field(description="ID of the SpanText")
    model_config = ConfigDict(from_attributes=True)
