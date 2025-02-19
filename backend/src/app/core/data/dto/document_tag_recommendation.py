from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.data.dto.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class DocumentTagRecommendationJobBaseDTO(BaseModel):
    user_id: int = Field(description="ID of the user who created the recommendation")
    project_id: int = Field(
        description="ID of the project this recommendation belongs to"
    )


# # Properties for creation
class DocumentTagRecommendationJobCreateIntern(BaseModel):
    user_id: int = Field(description="ID of the user who created the recommendation")
    project_id: int = Field(
        description="ID of the project this recommendation belongs to"
    )


class DocumentTagRecommendationJobCreate(BaseModel):
    project_id: int = Field(
        description="ID of the project this recommendation belongs to"
    )


# Properties for updating
class DocumentTagRecommendationJobUpdate(BaseModel, UpdateDTOBase):
    model_name: Optional[str] = Field(
        description="Name of the recommendation model", default=None
    )


# Properties for reading (as in ORM)
class DocumentTagRecommendationJobRead(DocumentTagRecommendationJobBaseDTO):
    task_id: int = Field(description="ID of the recommendation task")
    created: datetime = Field(
        description="Creation timestamp of the recommendation task."
    )
    model_config = ConfigDict(from_attributes=True)


class DocumentTagRecommendationLinkBaseDTO(BaseModel):
    recommendation_task_id: int = Field(
        description="Identifier of the Document Tag recommendation."
    )
    source_document_id: int = Field(description="ID of the source document")
    predicted_tag_id: int = Field(description="ID of the predicted tag")
    prediction_score: float = Field(description="Prediction score of the tag")
    is_accepted: Optional[bool] = Field(
        description="Acceptance status of the recommendation", default=None
    )


class DocumentTagRecommendationLinkCreate(DocumentTagRecommendationLinkBaseDTO):
    pass


class DocumentTagRecommendationLinkRead(DocumentTagRecommendationLinkBaseDTO):
    pass


class DocumentTagRecommendationLinkUpdate(BaseModel, UpdateDTOBase):
    # set timestamp in backend
    is_accepted: bool = Field(description="Acceptance status of the recommendation")


class DocumentTagRecommendationSummary(BaseModel):
    recommendation_id: int = Field(
        description="Unique identifier for the recommendation"
    )
    source_document: str = Field(description="Filename of the source document")
    predicted_tag_id: int = Field(description="ID of the predicted tag")
    predicted_tag: str = Field(description="Name of the predicted tag")
    prediction_score: float = Field(description="Confidence score of the predicition")
