from typing import List, Union

from app.core.data.dto.bbox_annotation import BBoxAnnotationRead
from app.core.data.dto.code import CodeRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.span_annotation import SpanAnnotationRead
from app.core.data.dto.span_text import SpanTextRead
from pydantic import BaseModel, Field


class CodeOccurrence(BaseModel):
    sdoc: SourceDocumentRead = Field(
        description="The SourceDocument where the Code occurs."
    )
    code: CodeRead = Field(description="The occuring Code.")
    text: str = Field(
        description="A text span of the SourceDocument annotated with the Code."
    )
    count: int = Field(
        description="The number of occurrences of the text span annotated with the Code in the SourceDocument."
    )


class CodeFrequency(BaseModel):
    code_id: int = Field(description="The id of the code.")
    count: int = Field(description="The number of occurrences of the code.")


class AnalysisConcept(BaseModel):
    name: str = Field(description="The nane of the concept.")
    sentences: List[str] = Field(description="The sentences describing the concept.")


class TimelineAnalysisResult(BaseModel):
    concept_name: str = Field(description="The name of the concept.")
    date: str = Field(description="The date of document.")

    sentence: str = Field(description="The similar sentence.")
    score: float = Field(description="The similarity score.")

    sdoc_id: int = Field(
        description="The id of the SourceDocument the similar sentence belongs to."
    )
    context: str = Field(description="The context of the similar sentence.")


class AnnotationOccurrence(BaseModel):
    annotation: Union[SpanAnnotationRead, BBoxAnnotationRead] = Field(
        description="The Annotation"
    )
    code: CodeRead = Field(description="The occuring Code.")
    sdoc: SourceDocumentRead = Field(
        description="The SourceDocument where the Code occurs."
    )
    text: str = Field(description="The Tet of the Annotation")
