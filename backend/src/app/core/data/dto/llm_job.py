from datetime import datetime
from enum import Enum
from typing import Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.data.dto.sentence_annotation import (
    SentenceAnnotationRead,
)
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataReadResolved,
)
from app.core.data.dto.span_annotation import SpanAnnotationRead

# --- START TASK PARAMETERS ---


class TaskType(str, Enum):
    DOCUMENT_TAGGING = "DOCUMENT_TAGGING"
    METADATA_EXTRACTION = "METADATA_EXTRACTION"
    ANNOTATION = "ANNOTATION"
    SENTENCE_ANNOTATION = "SENTENCE_ANNOTATION"


class SpecificTaskParameters(BaseModel):
    llm_job_type: TaskType = Field(description="The type of the LLMJob (what to llm)")


class DocumentBasedTaskParams(SpecificTaskParameters):
    sdoc_ids: List[int] = Field(description="IDs of the source documents to analyse")


class DocumentTaggingParams(DocumentBasedTaskParams):
    llm_job_type: Literal[TaskType.DOCUMENT_TAGGING]
    tag_ids: List[int] = Field(
        description="IDs of the tags to use for the document tagging"
    )


class MetadataExtractionParams(DocumentBasedTaskParams):
    llm_job_type: Literal[TaskType.METADATA_EXTRACTION]
    project_metadata_ids: List[int] = Field(
        description="IDs of the project metadata to use for the metadata extraction"
    )


class AnnotationParams(DocumentBasedTaskParams):
    llm_job_type: Literal[TaskType.ANNOTATION]
    code_ids: List[int] = Field(
        description="IDs of the codes to use for the annotation"
    )


class SentenceAnnotationParams(DocumentBasedTaskParams):
    llm_job_type: Literal[TaskType.SENTENCE_ANNOTATION]
    code_ids: List[int] = Field(
        description="IDs of the codes to use for the sentence annotation"
    )


class LLMJobParameters(BaseModel):
    llm_job_type: TaskType = Field(description="The type of the LLMJob (what to llm)")
    project_id: int = Field(description="The ID of the Project to analyse")
    specific_task_parameters: Union[
        DocumentTaggingParams,
        MetadataExtractionParams,
        AnnotationParams,
        SentenceAnnotationParams,
    ] = Field(
        description="Specific parameters for the LLMJob w.r.t it's type",
        discriminator="llm_job_type",
    )


# --- END TASK PARAMETERS ---

# --- START APPROACH PARAMETERS ---


class ApproachType(str, Enum):
    LLM_ZERO_SHOT = "LLM_ZERO_SHOT"
    LLM_FEW_SHOT = "LLM_FEW_SHOT"
    MODEL_TRAINING = "MODEL_TRAINING"


# Prompt template
class LLMPromptTemplates(BaseModel):
    language: str = Field(description="The language of the prompt template")
    system_prompt: str = Field(description="The system prompt to use for the job")
    user_prompt: str = Field(description="The user prompt to use for the job")


class SpecificApproachParameters(BaseModel):
    llm_approach_type: ApproachType = Field(
        description="The type of the LLMJob (what to llm)"
    )


class ZeroShotParams(SpecificApproachParameters):
    llm_approach_type: Literal[ApproachType.LLM_ZERO_SHOT]
    prompts: List[LLMPromptTemplates] = Field(
        description="The prompt templates to use for the job"
    )


class FewShotParams(SpecificApproachParameters):
    llm_approach_type: Literal[ApproachType.LLM_FEW_SHOT]
    prompts: List[LLMPromptTemplates] = Field(
        description="The prompt templates to use for the job"
    )


# Training Parameters (used for training the SequenceTaggingModel)
class TrainingParameters(BaseModel):
    max_epochs: int = Field(
        description="The maximum number of epochs to train the model"
    )
    batch_size: int = Field(description="The batch size to use for training")
    learning_rate: float = Field(description="The learning rate to use for training")


class ModelTrainingParams(SpecificApproachParameters):
    llm_approach_type: Literal[ApproachType.MODEL_TRAINING]
    training_parameters: TrainingParameters = Field(
        description="The training parameters to use for the job"
    )


class LLMJobParameters2(LLMJobParameters):
    llm_approach_type: ApproachType = Field(
        description="The approach to use for the LLMJob"
    )
    specific_approach_parameters: Union[
        ZeroShotParams,
        FewShotParams,
        ModelTrainingParams,
    ] = Field(
        description="Specific parameters for the approach w.r.t it's type",
        discriminator="llm_approach_type",
    )


# --- END APPROACH PARAMETERS ---

# --- START RESULTS ---


class LLMResultWithStatus(BaseModel):
    status: BackgroundJobStatus = Field(
        description="Status of the Result",
    )
    status_message: str = Field(description="Status message of the result")


class DocumentTaggingResult(LLMResultWithStatus):
    sdoc_id: int = Field(description="ID of the source document")
    current_tag_ids: List[int] = Field(
        description="IDs of the tags currently assigned to the document"
    )
    suggested_tag_ids: List[int] = Field(
        description="IDs of the tags suggested by the LLM to assign to the document"
    )
    reasoning: str = Field(description="Reasoning for the tagging")


class DocumentTaggingLLMJobResult(BaseModel):
    llm_job_type: Literal[TaskType.DOCUMENT_TAGGING]
    results: List[DocumentTaggingResult]


class MetadataExtractionResult(LLMResultWithStatus):
    sdoc_id: int = Field(description="ID of the source document")
    current_metadata: List[SourceDocumentMetadataReadResolved] = Field(
        description="Current metadata"
    )
    suggested_metadata: List[SourceDocumentMetadataReadResolved] = Field(
        description="Suggested metadata"
    )


class MetadataExtractionLLMJobResult(BaseModel):
    llm_job_type: Literal[TaskType.METADATA_EXTRACTION]
    results: List[MetadataExtractionResult]


class AnnotationResult(LLMResultWithStatus):
    sdoc_id: int = Field(description="ID of the source document")
    suggested_annotations: List[SpanAnnotationRead] = Field(
        description="Suggested annotations"
    )


class AnnotationLLMJobResult(BaseModel):
    llm_job_type: Literal[TaskType.ANNOTATION]
    results: List[AnnotationResult]


class SentenceAnnotationResult(LLMResultWithStatus):
    sdoc_id: int = Field(description="ID of the source document")
    suggested_annotations: List[SentenceAnnotationRead] = Field(
        description="Suggested annotations"
    )


class SentenceAnnotationLLMJobResult(BaseModel):
    llm_job_type: Literal[TaskType.SENTENCE_ANNOTATION]
    results: List[SentenceAnnotationResult]


class LLMJobResult(BaseModel):
    llm_job_type: TaskType = Field(description="The type of the LLMJob (what to llm)")
    specific_task_result: Union[
        DocumentTaggingLLMJobResult,
        MetadataExtractionLLMJobResult,
        AnnotationLLMJobResult,
        SentenceAnnotationLLMJobResult,
    ] = Field(
        description="Specific result for the LLMJob w.r.t it's type",
        discriminator="llm_job_type",
    )


# --- END RESULTS ---

# --- START CRUD ---


# Properties shared across all DTOs
class LLMJobBaseDTO(BaseModel):
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING, description="Status of the LLMJob"
    )
    num_steps_total: int = Field(description="Number of total steps.")
    current_step: int = Field(description="The current step.")
    current_step_description: str = Field(
        description="Description of the current step."
    )
    result: Optional[LLMJobResult] = Field(
        default=None, description="Results of the LLMJob."
    )


# Properties to create
class LLMJobCreate(LLMJobBaseDTO):
    parameters: LLMJobParameters2 = Field(
        description="The parameters of the LLMJob that defines what to do!"
    )


# Properties to update
class LLMJobUpdate(BaseModel, UpdateDTOBase):
    status: Optional[BackgroundJobStatus] = Field(
        default=None, description="Status of the LLMJob"
    )
    num_steps_total: Optional[int] = Field(
        default=None, description="Number of total steps."
    )
    current_step: Optional[int] = Field(default=None, description="The current step.")
    current_step_description: Optional[str] = Field(
        default=None, description="Description of the current step."
    )
    result: Optional[LLMJobResult] = Field(
        default=None, description="Result of the LLMJob."
    )


# Properties to read
class LLMJobRead(LLMJobBaseDTO):
    id: str = Field(description="ID of the LLMJob")
    parameters: LLMJobParameters2 = Field(
        description="The parameters of the LLMJob that defines what to llm!"
    )
    created: datetime = Field(description="Created timestamp of the LLMJob")
    updated: datetime = Field(description="Updated timestamp of the LLMJob")


# --- END CRUD ---

# --- START OTHER DTOs ---


class ApproachRecommendation(BaseModel):
    recommended_approach: ApproachType = Field(description="Recommended approach")
    reasoning: str = Field(description="Reasoning for the recommendation")
    available_approaches: Dict[ApproachType, bool] = Field(
        description="Available approaches"
    )


# --- END OTHER DTOs ---
