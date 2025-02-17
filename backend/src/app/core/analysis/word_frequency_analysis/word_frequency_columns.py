from sqlalchemy import String, cast, func
from sqlalchemy.dialects.postgresql import ARRAY, array, array_agg

from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.word_frequency import WordFrequencyORM
from app.core.db.sql_utils import aggregate_ids, aggregate_two_ids
from app.core.search.column_info import AbstractColumns
from app.core.search.filtering_operators import FilterOperator, FilterValueType
from app.core.search.search_builder import SearchBuilder


class WordFrequencyColumns(str, AbstractColumns):
    WORD = "WF_WORD"
    WORD_FREQUENCY = "WF_WORD_FREQUENCY"
    WORD_PERCENT = "WF_WORD_PERCENT"
    SOURCE_DOCUMENT_FREQUENCY = "WF_SOURCE_DOCUMENT_FREQUENCY"
    SOURCE_DOCUMENT_PERCENT = "WF_SOURCE_DOCUMENT_PERCENT"
    SOURCE_DOCUMENT_FILENAME = "WF_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "WF_DOCUMENT_TAG_ID_LIST"
    CODE_ID_LIST = "WF_CODE_ID_LIST"
    USER_ID_LIST = "WF_USER_ID_LIST"
    SPAN_ANNOTATIONS = "WF_SPAN_ANNOTATIONS"

    def get_filter_column(self, subquery_dict):
        match self:
            case WordFrequencyColumns.WORD:
                return WordFrequencyORM.word
            case WordFrequencyColumns.WORD_FREQUENCY:
                return WordFrequencyColumns.WORD_FREQUENCY
            case WordFrequencyColumns.WORD_PERCENT:
                return WordFrequencyColumns.WORD_PERCENT
            case WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY:
                return WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY
            case WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT:
                return WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT
            case WordFrequencyColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case WordFrequencyColumns.DOCUMENT_TAG_ID_LIST:
                return subquery_dict[WordFrequencyColumns.DOCUMENT_TAG_ID_LIST]
            case WordFrequencyColumns.CODE_ID_LIST:
                return subquery_dict[WordFrequencyColumns.CODE_ID_LIST]
            case WordFrequencyColumns.USER_ID_LIST:
                return subquery_dict[WordFrequencyColumns.USER_ID_LIST]
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                return subquery_dict[WordFrequencyColumns.SPAN_ANNOTATIONS]

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case WordFrequencyColumns.WORD:
                return FilterOperator.STRING
            case WordFrequencyColumns.WORD_FREQUENCY:
                return FilterOperator.NUMBER
            case WordFrequencyColumns.WORD_PERCENT:
                return FilterOperator.NUMBER
            case WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY:
                return FilterOperator.NUMBER
            case WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT:
                return FilterOperator.NUMBER
            case WordFrequencyColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterOperator.STRING
            case WordFrequencyColumns.DOCUMENT_TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case WordFrequencyColumns.CODE_ID_LIST:
                return FilterOperator.ID_LIST
            case WordFrequencyColumns.USER_ID_LIST:
                return FilterOperator.ID_LIST
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                return FilterOperator.ID_LIST

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case WordFrequencyColumns.WORD:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.WORD_FREQUENCY:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.WORD_PERCENT:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case WordFrequencyColumns.DOCUMENT_TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case WordFrequencyColumns.CODE_ID_LIST:
                return FilterValueType.CODE_ID
            case WordFrequencyColumns.USER_ID_LIST:
                return FilterValueType.USER_ID
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                return FilterValueType.SPAN_ANNOTATION

    def get_sort_column(self):
        match self:
            case WordFrequencyColumns.WORD:
                return WordFrequencyORM.word
            case WordFrequencyColumns.WORD_FREQUENCY:
                return WordFrequencyColumns.WORD_FREQUENCY
            case WordFrequencyColumns.WORD_PERCENT:
                return WordFrequencyColumns.WORD_PERCENT
            case WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY:
                return WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY
            case WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT:
                return WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT
            case WordFrequencyColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case WordFrequencyColumns.DOCUMENT_TAG_ID_LIST:
                return None
            case WordFrequencyColumns.CODE_ID_LIST:
                return None
            case WordFrequencyColumns.USER_ID_LIST:
                return None
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                return None

    def get_label(self) -> str:
        match self:
            case WordFrequencyColumns.WORD:
                return "Word"
            case WordFrequencyColumns.WORD_FREQUENCY:
                return "Word frequency"
            case WordFrequencyColumns.WORD_PERCENT:
                return "Word %"
            case WordFrequencyColumns.SOURCE_DOCUMENT_FREQUENCY:
                return "Document frequency"
            case WordFrequencyColumns.SOURCE_DOCUMENT_PERCENT:
                return "Document %"
            case WordFrequencyColumns.SOURCE_DOCUMENT_FILENAME:
                return "Document name"
            case WordFrequencyColumns.DOCUMENT_TAG_ID_LIST:
                return "Tags"
            case WordFrequencyColumns.CODE_ID_LIST:
                return "Codes"
            case WordFrequencyColumns.USER_ID_LIST:
                return "Annotated by"
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                return "Span annotations"

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case WordFrequencyColumns.DOCUMENT_TAG_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        DocumentTagORM.id,
                        label=WordFrequencyColumns.DOCUMENT_TAG_ID_LIST.value,
                    )
                )
                query_builder._join_subquery(
                    SourceDocumentORM.document_tags, isouter=True
                )
            case WordFrequencyColumns.CODE_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_two_ids(
                        SpanAnnotationORM.code_id,
                        SentenceAnnotationORM.code_id,
                        label=WordFrequencyColumns.CODE_ID_LIST.value,
                    )
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                    isouter=True,
                )
                query_builder._join_subquery(
                    SpanAnnotationORM,
                    SpanAnnotationORM.annotation_document_id
                    == AnnotationDocumentORM.id,
                    isouter=True,
                )
                query_builder._join_subquery(
                    SentenceAnnotationORM,
                    SentenceAnnotationORM.annotation_document_id
                    == AnnotationDocumentORM.id,
                    isouter=True,
                )

            case WordFrequencyColumns.USER_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        AnnotationDocumentORM.user_id,
                        WordFrequencyColumns.USER_ID_LIST.value,
                    )
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                    isouter=True,
                )
            case WordFrequencyColumns.SPAN_ANNOTATIONS:
                query_builder._add_subquery_column(
                    cast(
                        array_agg(
                            func.distinct(
                                array(
                                    [
                                        cast(SpanAnnotationORM.code_id, String),
                                        SpanTextORM.text,
                                    ]
                                )
                            ),
                        ),
                        ARRAY(String, dimensions=2),
                    ).label(WordFrequencyColumns.SPAN_ANNOTATIONS.value)
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                    isouter=True,
                )
                query_builder._join_subquery(
                    SpanAnnotationORM,
                    SpanAnnotationORM.annotation_document_id
                    == AnnotationDocumentORM.id,
                    isouter=True,
                )
                query_builder._join_subquery(
                    SpanTextORM,
                    SpanTextORM.id == SpanAnnotationORM.span_text_id,
                    isouter=True,
                )

    def add_query_filter_statements(self, query_builder: SearchBuilder):
        pass
