import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union

import srsly
from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import field_validator

from app.core.data.dto.background_job_base import (
    BackgroundJobBase,
    BackgroundJobBaseUpdate,
)
from app.core.data.dto.dto_base import UpdateDTOBase

####################
# COTA Base Types
####################


class COTASentence(BaseModel):
    sentence_id: int = Field(description="ID of the Sentence in the SDoc")
    sdoc_id: int = Field(
        description="ID of the Sentence Document that contains the Sentence"
    )
    text: Optional[str] = Field(description="Text of the Sentence", default=None)


class COTAConcept(BaseModel):
    name: str = Field(description="Name of the Concept")
    description: str = Field(description="Description of the Concept")
    color: str = Field(description="Color of the Concept")
    visible: bool = Field(description="Visibility of the Concept")
    id: str = Field(description="ID of the Concept")


class COTAConceptWithSentences(COTAConcept):
    sentences: List[COTASentence] = Field(
        description="List of Sentences that describe the Concept"
    )


class COTAConceptSimilarSentences(BaseModel):
    concept: COTAConceptWithSentences = Field(description="Concept with Sentences")
    similarity_scores: List[float] = Field(
        description="List of similarity scores of the Sentences"
    )
    plot_coordinates: List[Tuple[float, float]] = Field(
        description="List of coordinates of the Sentences embeddings for plotting"
    )
    sdoc_timestamps: Dict[int, datetime] = Field(
        description="Dictionary of SDocIDs and their timestamps"
    )


####################
# COTA DTOs
####################


class ConceptOverTimeAnalysisBaseDTO(BaseModel):
    name: str = Field(description="Name of the ConceptOverTimeAnalysis")
    description: str = Field(description="Description of the ConceptOverTimeAnalysis")


class COTACreate(ConceptOverTimeAnalysisBaseDTO):
    project_id: int = Field(
        description="Project the ConceptOverTimeAnalysis belongs to"
    )
    user_id: int = Field(description="User the ConceptOverTimeAnalysis belongs to")
    name: str = Field(description="Name of the ConceptOverTimeAnalysis")


class COTAUpdate(ConceptOverTimeAnalysisBaseDTO, UpdateDTOBase):
    name: Optional[str] = Field(
        description="Name of the ConceptOverTimeAnalysis",
        default=None,
    )
    description: Optional[str] = Field(
        description="Description of the ConceptOverTimeAnalysis",
        default=None,
    )
    concepts: Optional[List[COTAConcept]] = Field(
        description="List of Concepts that are part of the ConceptOverTimeAnalysis",
        default=None,
    )


class COTAUpdateAsInDB(BaseModel, UpdateDTOBase):
    name: Optional[str] = Field(
        description="Name of the ConceptOverTimeAnalysis",
        default=None,
    )
    description: Optional[str] = Field(
        description="Description of the ConceptOverTimeAnalysis",
        default=None,
    )
    concepts: Optional[str] = Field(
        description=(
            "JSON Representation of the list of Concepts that are "
            "part of the ConceptOverTimeAnalysis"
        ),
        default=None,
    )
    sentence_search_space: Optional[str] = Field(
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
    concepts: List[COTAConcept] = Field(
        description="List of Concepts that are part of the ConceptOverTimeAnalysis"
    )
    sentence_search_space: List[COTASentence] = Field(
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
            if isinstance(data, List) and isinstance(data[0], dict):
                return [COTAConcept(**concept) for concept in data]
            else:
                raise ValueError(
                    "Invalid value for concepts. "
                    "Must be a JSON string or a list of COTAConcepts."
                )
        elif isinstance(v, List) and isinstance(v[0], dict):
            return [COTAConcept(**concept) for concept in v]
        elif isinstance(v, List) and isinstance(v[0], COTAConcept):
            return v
        else:
            raise ValueError(
                "Invalid value for concepts. "
                "Must be a JSON string or a list of COTAConcepts."
            )

    @field_validator("sentence_search_space", mode="before")
    @classmethod
    def json_loads_sss(cls, v: Union[str, List]) -> List[COTASentence]:
        if isinstance(v, str):
            # v is a JSON string from the DB
            data = srsly.json_loads(v)
            if isinstance(data, List) and isinstance(data[0], dict):
                return [COTASentence(**sentence) for sentence in data]
            else:
                raise ValueError(
                    "Invalid value for concepts. "
                    "Must be a JSON string or a list of COTAConcepts."
                )
        elif isinstance(v, List) and isinstance(v[0], dict):
            return [COTASentence(**sentence) for sentence in v]
        elif isinstance(v, List) and isinstance(v[0], COTASentence):
            return v
        else:
            raise ValueError(
                "Invalid value for sentence_search_space. "
                "Must be a JSON string or a list of COTASentences."
            )

    model_config = ConfigDict(from_attributes=True)


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
