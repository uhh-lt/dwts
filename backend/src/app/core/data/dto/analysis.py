from datetime import datetime
from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm.attributes import InstrumentedAttribute

from app.core.data.dto.bbox_annotation import (
    BBoxAnnotationRead,
)
from app.core.data.dto.code import CodeRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.memo import MemoRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.span_annotation import (
    SpanAnnotationRead,
    SpanAnnotationReadResolved,
)


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
    text: str = Field(description="The Text of the Annotation")


class AnnotationOccurrence2(BaseModel):
    annotation: SpanAnnotationReadResolved = Field(description="The Annotation")
    sdoc: SourceDocumentRead = Field(
        description="The SourceDocument where the Code occurs."
    )
    tags: List[DocumentTagRead] = Field(
        description="The DocumentTags of the SourceDocument."
    )
    text: str = Field(description="The Text of the Annotation")
    memos: List[MemoRead] = Field(description="The Memos of the Annotation.")


class AnnotationTableRow(BaseModel):
    id: int = Field(description="ID of the SpanAnnotation")
    span_text: str = Field(description="The SpanText the SpanAnnotation spans.")
    code: CodeRead = Field(description="Code the SpanAnnotation refers to")
    annotation_document_id: int = Field(
        description="AnnotationDocument the SpanAnnotation refers to"
    )
    user_id: int = Field(description="User the SpanAnnotation belongs to")
    sdoc: SourceDocumentRead = Field(
        description="SourceDocument the SpanAnnotation refers to"
    )
    tags: List[DocumentTagRead] = Field(
        description="The DocumentTags of the SourceDocument."
    )
    memo: Optional[MemoRead] = Field(description="The Memo of the Annotation.")


class AnnotatedSegmentResult(BaseModel):
    total_results: int = Field(
        description="The total number of span_annotation_ids. Used for pagination."
    )
    data: List[AnnotationTableRow] = Field(description="The Annotations.")


class TimelineAnalysisResultNew(BaseModel):
    date: str = Field(description="The date.")
    sdoc_ids: List[int] = Field(description="The SourceDoument IDs.")


class WordFrequencyStat(BaseModel):
    word: str = Field(description="The word.")
    word_percent: float = Field(description="The percentage of the word.")
    count: int = Field(description="The SourceDoument IDs.")
    sdocs: int = Field(description="The number of SourceDocuments.")
    sdocs_percent: float = Field(description="The percentage of SourceDocuments.")


class WordFrequencyResult(BaseModel):
    total_results: int = Field(
        description="The total number of word_frequencies. Used for pagination."
    )
    sdocs_total: int = Field(description="The total number of SourceDocuments.")
    words_total: int = Field(description="The total number of words.")
    word_frequencies: List[WordFrequencyStat] = Field(
        description="The WordFrequencies."
    )


class SampledSdocsResults(BaseModel):
    tags: List[int] = Field(description="The tags aggregated by.")
    sdocs: List[int] = Field(description="The grouped SourceDocument IDs.")
    sample_fixed: List[int] = Field(
        description="The fixed sample of SourceDocument IDs."
    )
    sample_relative: List[int] = Field(
        description="The relative sample of SourceDocument IDs."
    )


class DateGroupBy(Enum):
    YEAR = "YEAR"
    MONTH = "MONTH"
    DAY = "DAY"

    def apply(self, column: InstrumentedAttribute[datetime]) -> List:
        match self:
            case DateGroupBy.YEAR:
                return [func.extract("year", column)]
            case DateGroupBy.MONTH:
                return [func.extract("year", column), func.extract("month", column)]
            case DateGroupBy.DAY:
                return [
                    func.extract("year", column),
                    func.extract("month", column),
                    func.extract("day", column),
                ]
