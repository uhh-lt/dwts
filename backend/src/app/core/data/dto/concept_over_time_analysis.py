from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import srsly
from app.core.data.dto.dto_base import UpdateDTOBase
from pydantic import BaseModel, Field
from pydantic.utils import GetterDict


class COTASentence(BaseModel):
    sentence_id: int = Field(description="ID of the Sentence in the SDoc")
    sdoc_id: int = Field(
        description="ID of the Sentence Document that contains the Sentence"
    )
    text: Optional[str] = Field(description="Text of the Sentence", default=None)


class COTAConcept(BaseModel):
    name: str = Field(description="Name of the Concept")
    description: str = Field(description="Description of the Concept")


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


class COTACustomGetterDict(GetterDict):
    def get(self, key: str, default: Any) -> Any:
        if key == "concepts":
            data = srsly.json_loads(self._obj.__getattribute__(key))
            return [COTAConcept(**concept) for concept in data]  # type: ignore
        elif key == "sentence_search_space":
            data = srsly.json_loads(self._obj.__getattribute__(key))
            return [COTASentence(**sentence) for sentence in data]  # type: ignore

        return super().get(key, default)


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
        )
    )
    created: datetime = Field(
        description="Created timestamp of the ConceptOverTimeAnalysis"
    )
    updated: datetime = Field(
        description="Updated timestamp of the ConceptOverTimeAnalysis"
    )

    class Config:
        orm_mode = True
        getter_dict = COTACustomGetterDict
