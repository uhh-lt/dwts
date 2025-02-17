from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm.attributes import InstrumentedAttribute

from app.core.data.dto.code import CodeRead
from app.core.data.dto.memo import MemoRead
from app.core.data.dto.source_document import SourceDocumentRead


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


class SpanAnnotationRow(BaseModel):
    id: int = Field(description="ID of the SpanAnnotation")
    span_text: str = Field(description="The SpanText the SpanAnnotation spans.")
    code: CodeRead = Field(description="Code the SpanAnnotation refers to")
    user_id: int = Field(description="User the SpanAnnotation belongs to")
    sdoc: SourceDocumentRead = Field(
        description="SourceDocument the SpanAnnotation refers to"
    )
    tag_ids: List[int] = Field(description="The DocumentTagIDs of the SourceDocument.")
    memo: Optional[MemoRead] = Field(description="The Memo of the Annotation.")


class SpanAnnotationSearchResult(BaseModel):
    total_results: int = Field(
        description="The total number of span_annotation_ids. Used for pagination."
    )
    data: List[SpanAnnotationRow] = Field(description="The Annotations.")


class SentenceAnnotationRow(BaseModel):
    id: int = Field(description="ID of the SentenceAnnotation")
    text: str = Field(description="The Text the SentenceAnnotation spans.")
    code: CodeRead = Field(description="Code the SentenceAnnotation refers to")
    user_id: int = Field(description="User the SentenceAnnotation belongs to")
    sdoc: SourceDocumentRead = Field(
        description="SourceDocument the SentenceAnnotation refers to"
    )
    tag_ids: List[int] = Field(description="The DocumentTagIDs of the SourceDocument.")
    memo: Optional[MemoRead] = Field(description="The Memo of the Annotation.")


class SentenceAnnotationSearchResult(BaseModel):
    total_results: int = Field(
        description="The total number of sentence_annotation_ids. Used for pagination."
    )
    data: List[SentenceAnnotationRow] = Field(description="The Annotations.")


class BBoxAnnotationRow(BaseModel):
    id: int = Field(description="ID of the BBoxAnnotation")
    x: int = Field(description="The x-coordinate of the BBoxAnnotation.")
    y: int = Field(description="The y-coordinate of the BBoxAnnotation.")
    width: int = Field(description="The width of the BBoxAnnotation.")
    height: int = Field(description="The height of the BBoxAnnotation.")
    url: str = Field(description="The url to the Image of the BBoxAnnotation.")
    code: CodeRead = Field(description="Code the BBoxAnnotation refers to")
    user_id: int = Field(description="User the BBoxAnnotation belongs to")
    sdoc: SourceDocumentRead = Field(
        description="SourceDocument the BBoxAnnotation refers to"
    )
    tag_ids: List[int] = Field(description="The DocumentTagIDs of the SourceDocument.")
    memo: Optional[MemoRead] = Field(description="The Memo of the Annotation.")


class BBoxAnnotationSearchResult(BaseModel):
    total_results: int = Field(
        description="The total number of bbox_annotation_ids. Used for pagination."
    )
    data: List[BBoxAnnotationRow] = Field(description="The Annotations.")


class TimelineAnalysisResult(BaseModel):
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
