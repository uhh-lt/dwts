from typing import Optional

from pydantic import BaseModel, ConfigDict, model_validator


# Properties shared across all DTOs
class ObjectHandleBaseDTO(BaseModel):
    user_id: Optional[int] = None
    project_id: Optional[int] = None
    code_id: Optional[int] = None
    source_document_id: Optional[int] = None
    span_annotation_id: Optional[int] = None
    sentence_annotation_id: Optional[int] = None
    span_group_id: Optional[int] = None
    bbox_annotation_id: Optional[int] = None
    document_tag_id: Optional[int] = None
    memo_id: Optional[int] = None

    @model_validator(mode="after")
    def check_at_least_one_not_null(self):
        # make sure that at least one of the fields is not null
        values = self.model_dump()
        for val in values.values():
            if val is not None:
                return self
        raise ValueError("At least one of the fields has to be not null!")


# Properties for creation
class ObjectHandleCreate(ObjectHandleBaseDTO):
    pass


# Properties for reading (as in ORM)
class ObjectHandleRead(ObjectHandleBaseDTO):
    id: int
    model_config = ConfigDict(from_attributes=True)
