import uuid
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Union

import srsly
from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import field_validator

from app.core.data.dto.analysis import DateGroupBy
from app.core.data.dto.background_job_base import (
    BackgroundJobBase,
    BackgroundJobBaseUpdate,
)
from app.core.data.dto.dto_base import UpdateDTOBase

####################
# COTA Base Types
####################


class COTASentenceID(BaseModel):
    sentence_id: int = Field(description="ID of the Sentence in the SDoc")
    sdoc_id: int = Field(
        description="ID of the Sentence Document that contains the Sentence"
    )


class COTASentence(COTASentenceID):
    concept_similarities: Dict[str, float] = Field(
        description="Dictionary of Concept IDs and their similarity score"
    )
    concept_probabilities: Dict[str, float] = Field(
        description="Dictionary of Concept IDs and their probability score"
    )
    concept_annotation: Optional[str] = Field(
        description="Concept ID this sentence belongs to"
    )
    x: float = Field(description="X coordinate of the Sentence in the search space")
    y: float = Field(description="Y coordinate of the Sentence in the search space")
    date: datetime = Field(description="date of the sdoc")
    text: str = Field(description="text of the sentence")


class COTAConcept(BaseModel):
    id: str = Field(description="ID of the Concept")
    name: str = Field(description="Name of the Concept")
    description: str = Field(description="Description of the Concept")
    color: str = Field(description="Color of the Concept")
    visible: bool = Field(description="Visibility of the Concept")


class COTATimelineSettings(BaseModel):
    group_by: DateGroupBy = Field(description="Group by date", default=DateGroupBy.YEAR)
    date_metadata_id: Optional[int] = Field(
        description="ID of the Project Date Metadata that is used for the ConceptOverTimeAnalysis",
        default=None,
    )
    threshold: float = Field(
        description="Threshold of the ConceptOverTimeAnalysis", default=0.9
    )


class DimensionalityReductionAlgorithm(Enum):
    UMAP = "umap"
    PCA = "pca"
    TSNE = "tsne"


class COTATrainingSettings(BaseModel):
    search_space_topk: int = Field(
        description="Number of sentences to use as search space per concept.",
        default=1000,
    )
    search_space_threshold: float = Field(
        description="Threshold to filter sentences from the search space.",
        default=0.8,
    )
    min_required_annotations_per_concept: int = Field(
        description="Minimum number of annotations per concept required to train the CEM.",
        default=5,
    )
    dimensionality_reduction_algorithm: DimensionalityReductionAlgorithm = Field(
        description="Dimensionality Reduction Algorithm used for the ConceptOverTimeAnalysis",
        default=DimensionalityReductionAlgorithm.UMAP,
    )
    layers: int = Field(description="Number of layers of the CEM.", default=5)
    dimensions: int = Field(description="Number of dimensions of the CEM.", default=64)
    epochs: int = Field(description="Number of epochs to train", default=5)


####################
# Annotation DTOs
####################


####################
# COTA DTOs
####################


class ConceptOverTimeAnalysisBaseDTO(BaseModel):
    name: str = Field(description="Name of the ConceptOverTimeAnalysis")


class COTACreate(ConceptOverTimeAnalysisBaseDTO):
    project_id: int = Field(
        description="Project the ConceptOverTimeAnalysis belongs to"
    )
    user_id: int = Field(description="User the ConceptOverTimeAnalysis belongs to")


class COTAUpdate(BaseModel, UpdateDTOBase):
    name: Optional[str] = Field(
        description="Name of the ConceptOverTimeAnalysis",
        default=None,
    )
    timeline_settings: Optional[COTATimelineSettings] = Field(
        description="Timeline Settings of the ConceptOverTimeAnalysis.",
        default=None,
    )
    training_settings: Optional[COTATrainingSettings] = Field(
        description="Training Settings of the ConceptOverTimeAnalysis.",
        default=None,
    )
    concepts: Optional[List[COTAConcept]] = Field(
        description="List of Concepts that are part of the ConceptOverTimeAnalysis",
        default=None,
    )
    # search_space is missing intentionally: we do not allow to update search space directly


class COTAUpdateAsInDB(BaseModel, UpdateDTOBase):
    name: Optional[str] = Field(
        description="Name of the ConceptOverTimeAnalysis",
        default=None,
    )
    timeline_settings: Optional[str] = Field(
        description="JSON Representation of the Timeline Settings of the ConceptOverTimeAnalysis.",
        default=None,
    )
    training_settings: Optional[str] = Field(
        description="JSON Representation of the Training Settings of the ConceptOverTimeAnalysis.",
        default=None,
    )
    concepts: Optional[str] = Field(
        description=(
            "JSON Representation of the list of Concepts that are "
            "part of the ConceptOverTimeAnalysis"
        ),
        default=None,
    )
    search_space: Optional[str] = Field(
        description=(
            "JSON Representation of the list of Sentences that form the search space "
            "of the ConceptOverTimeAnalysis"
        ),
        default=None,
    )


class COTARead(ConceptOverTimeAnalysisBaseDTO):
    id: int = Field(description="ID of the ConceptOverTimeAnalysis")
    user_id: int = Field(description="User the ConceptOverTimeAnalysis belongs to")
    project_id: int = Field(
        description="Project the ConceptOverTimeAnalysis belongs to"
    )
    timeline_settings: COTATimelineSettings = Field(
        description="Timeline Analysis Settings of the ConceptOverTimeAnalysis."
    )
    training_settings: COTATrainingSettings = Field(
        description="Timeline Training Settings of the ConceptOverTimeAnalysis."
    )
    concepts: List[COTAConcept] = Field(
        description="List of Concepts that are part of the ConceptOverTimeAnalysis"
    )
    search_space: List[COTASentence] = Field(
        description=(
            "List of Sentences that form the search space "
            "of the ConceptOverTimeAnalysis"
        ),
    )
    created: datetime = Field(
        description="Created timestamp of the ConceptOverTimeAnalysis"
    )
    updated: datetime = Field(
        description="Updated timestamp of the ConceptOverTimeAnalysis"
    )

    @field_validator("concepts", mode="before")
    @classmethod
    def json_loads_concepts(cls, v: Union[str, List]) -> List[COTAConcept]:
        if isinstance(v, str):
            # v is a JSON string from the DB
            data = srsly.json_loads(v)
            if isinstance(data, List):
                if len(data) == 0:
                    return []
                elif isinstance(data[0], dict):
                    return [COTAConcept(**concept) for concept in data]
        elif isinstance(v, List):
            if len(v) == 0:
                return []
            elif isinstance(v[0], dict):
                return [COTAConcept(**concept) for concept in v]
            elif isinstance(v[0], COTAConcept):
                return v

        raise ValueError(
            "Invalid value for concepts. "
            "Must be a JSON string or a list of COTAConcepts."
        )

    @field_validator("search_space", mode="before")
    @classmethod
    def json_loads_ss(cls, v: Union[str, List]) -> List[COTASentence]:
        if isinstance(v, str):
            # v is a JSON string from the DB
            data = srsly.json_loads(v)
            if isinstance(data, List):
                if len(data) == 0:
                    return []
                elif isinstance(data[0], dict):
                    return [COTASentence(**sentence) for sentence in data]
        elif isinstance(v, List):
            if len(v) == 0:
                return []
            elif isinstance(v[0], dict):
                return [COTASentence(**sentence) for sentence in v]
            elif isinstance(v[0], COTASentence):
                return v

        raise ValueError(
            "Invalid value for search_space. "
            "Must be a JSON string or a list of COTASentences."
        )

    @field_validator("timeline_settings", mode="before")
    @classmethod
    def json_loads_timeline_settings(cls, v: Union[str, dict]) -> COTATimelineSettings:
        if isinstance(v, str):
            # v is a JSON string from the DB
            data = srsly.json_loads(v)
            if isinstance(data, dict):
                return COTATimelineSettings(**data)
        elif isinstance(v, dict):
            return COTATimelineSettings(**v)

        raise ValueError(
            "Invalid value for timeline_settings. "
            "Must be a JSON string or a dict of COTATimelineSettings."
        )

    @field_validator("training_settings", mode="before")
    @classmethod
    def json_loads_training_settings(cls, v: Union[str, dict]) -> COTATrainingSettings:
        if isinstance(v, str):
            # v is a JSON string from the DB
            data = srsly.json_loads(v)
            if isinstance(data, dict):
                return COTATrainingSettings(**data)
        elif isinstance(v, dict):
            return COTATrainingSettings(**v)

        raise ValueError(
            "Invalid value for training_settings. "
            "Must be a JSON string or a dict of COTATrainingSettings."
        )

    model_config = ConfigDict(from_attributes=True)

    def __str__(self) -> str:
        return f"COTARead(id={self.id}, name={self.name}, user_id={self.user_id}, project_id={self.project_id}, timeline_settings={self.timeline_settings}, training_settings={self.training_settings}, concepts={self.concepts}, search_space={len(self.search_space)}, created={self.created}, updated={self.updated})"

    def __repr__(self) -> str:
        return str(self)


####################
# COTA Refinement Job
####################


class COTARefinementHyperparameters(BaseModel):
    cem_training_epochs: int = Field(
        description="Number of epochs to train the Concept Embedding Model",
        default=10,
    )

    cem_dimensions: int = Field(
        description="Number of dimensions of the Concept Embedding Model",
        default=64,
    )


class COTARefinementJobBase(BackgroundJobBase):
    pass


class COTARefinementJobCreate(COTARefinementJobBase):
    cota: COTARead = Field(description="COTA that is used in the COTARefinementJob")

    hyperparams: COTARefinementHyperparameters = Field(
        description="Hyperparameters of the COTARefinementJob"
    )


class COTARefinementJobUpdate(BackgroundJobBaseUpdate):
    current_pipeline_step: Optional[str] = Field(
        description="Current Pipeline Step of the COTARefinementJob",
        default=None,
    )

    error_message: Optional[str] = Field(
        description="Optional ErrorMessage of the COTARefinementJob",
        default=None,
    )


class COTARefinementJobRead(COTARefinementJobCreate):
    id: str = Field(
        description="ID of the COTARefinementJob",
        default_factory=lambda: str(uuid.uuid4()),
    )

    current_pipeline_step: Optional[str] = Field(
        description="Current Pipeline Step of the COTARefinementJob",
        default=None,
    )

    error_message: Optional[str] = Field(
        description="Optional ErrorMessage of the COTARefinementJob",
        default=None,
    )

    created: datetime = Field(description="Created timestamp of the COTARefinementJob")
    updated: datetime = Field(description="Updated timestamp of the COTARefinementJob")

    model_config = ConfigDict(from_attributes=True)
