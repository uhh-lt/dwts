from datetime import datetime
from enum import StrEnum
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.core.data.dto.background_job_base import BackgroundJobStatus


class MLJobType(StrEnum):
    QUOTATION_ATTRIBUTION = "QUOTATION_ATTRIBUTION"


class QuotationAttributionLMJobParams(BaseModel):
    llm_job_type: Literal[MLJobType.QUOTATION_ATTRIBUTION]
    recompute: bool = Field(
        default=False, description="Whether to recompute already processed documents"
    )


class MLJobParameters(BaseModel):
    ml_job_type: MLJobType = Field(description="The type of the MLJob")
    project_id: int = Field(description="The ID of the Project to analyse")
    specific_llm_job_parameters: QuotationAttributionLMJobParams = Field(
        description="Specific parameters for the LLMJob w.r.t it's type",
        discriminator="llm_job_type",
    )


class MLJobBase(BaseModel):
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING, description="Status of the LLMJob"
    )
    error: Optional[str] = Field(default=None, description="Error message (if any)")


class MLJobRead(MLJobBase):
    id: str = Field(description="ID of the MLJob")
    created: datetime = Field(description="Created timestamp of the LLMJob")
    updated: datetime = Field(description="Updated timestamp of the LLMJob")
    parameters: MLJobParameters


class MLJobCreate(MLJobBase):
    parameters: MLJobParameters


class MLJobUpdate(MLJobBase):
    pass
