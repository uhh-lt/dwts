from sqlalchemy import String, cast, func
from sqlalchemy.dialects.postgresql import ARRAY, array, array_agg

from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.db.sql_utils import (
    aggregate_ids,
    aggregate_two_ids,
)
from app.core.search.column_info import AbstractColumns
from app.core.search.filtering_operators import FilterOperator, FilterValueType
from app.core.search.search_builder import SearchBuilder


class SdocColumns(str, AbstractColumns):
    SOURCE_DOCUMENT_TYPE = "SD_SOURCE_DOCUMENT_TYPE"
    SOURCE_DOCUMENT_FILENAME = "SD_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "SD_DOCUMENT_TAG_ID_LIST"
    CODE_ID_LIST = "SD_CODE_ID_LIST"
    USER_ID_LIST = "SD_USER_ID_LIST"
    SPAN_ANNOTATIONS = "SD_SPAN_ANNOTATIONS"

    def get_filter_column(self, subquery_dict: dict):
        match self:
            case SdocColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case SdocColumns.SOURCE_DOCUMENT_TYPE:
                return SourceDocumentORM.doctype
            case SdocColumns.DOCUMENT_TAG_ID_LIST:
                return subquery_dict[SdocColumns.DOCUMENT_TAG_ID_LIST.value]
            case SdocColumns.CODE_ID_LIST:
                return subquery_dict[SdocColumns.CODE_ID_LIST.value]
            case SdocColumns.USER_ID_LIST:
                return subquery_dict[SdocColumns.USER_ID_LIST.value]
            case SdocColumns.SPAN_ANNOTATIONS:
                return subquery_dict[SdocColumns.SPAN_ANNOTATIONS.value]

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case SdocColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterOperator.STRING
            case SdocColumns.SOURCE_DOCUMENT_TYPE:
                return FilterOperator.ID
            case SdocColumns.DOCUMENT_TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case SdocColumns.CODE_ID_LIST:
                return FilterOperator.ID_LIST
            case SdocColumns.USER_ID_LIST:
                return FilterOperator.ID_LIST
            case SdocColumns.SPAN_ANNOTATIONS:
                return FilterOperator.ID_LIST

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case SdocColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case SdocColumns.SOURCE_DOCUMENT_TYPE:
                return FilterValueType.DOC_TYPE
            case SdocColumns.DOCUMENT_TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case SdocColumns.CODE_ID_LIST:
                return FilterValueType.CODE_ID
            case SdocColumns.USER_ID_LIST:
                return FilterValueType.USER_ID
            case SdocColumns.SPAN_ANNOTATIONS:
                return FilterValueType.SPAN_ANNOTATION

    def get_sort_column(self):
        match self:
            case SdocColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case SdocColumns.SOURCE_DOCUMENT_TYPE:
                return SourceDocumentORM.doctype
            case SdocColumns.DOCUMENT_TAG_ID_LIST:
                return None
            case SdocColumns.CODE_ID_LIST:
                return None
            case SdocColumns.USER_ID_LIST:
                return None
            case SdocColumns.SPAN_ANNOTATIONS:
                return None

    def get_label(self) -> str:
        match self:
            case SdocColumns.SOURCE_DOCUMENT_FILENAME:
                return "Document name"
            case SdocColumns.SOURCE_DOCUMENT_TYPE:
                return "Type"
            case SdocColumns.DOCUMENT_TAG_ID_LIST:
                return "Tags"
            case SdocColumns.CODE_ID_LIST:
                return "Code"
            case SdocColumns.USER_ID_LIST:
                return "Annotated by"
            case SdocColumns.SPAN_ANNOTATIONS:
                return "Span annotations"

    def add_subquery_filter_statements(self, query_builder: SearchBuilder):
        match self:
            case SdocColumns.DOCUMENT_TAG_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        DocumentTagORM.id,
                        label=SdocColumns.DOCUMENT_TAG_ID_LIST.value,
                    )
                )
                query_builder._join_subquery(
                    SourceDocumentORM.document_tags, isouter=True
                )
            case SdocColumns.CODE_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_two_ids(
                        SpanAnnotationORM.code_id,
                        SentenceAnnotationORM.code_id,
                        label=SdocColumns.CODE_ID_LIST.value,
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

            case SdocColumns.USER_ID_LIST:
                query_builder._add_subquery_column(
                    aggregate_ids(
                        AnnotationDocumentORM.user_id, SdocColumns.USER_ID_LIST.value
                    )
                )
                query_builder._join_subquery(
                    AnnotationDocumentORM,
                    AnnotationDocumentORM.source_document_id == SourceDocumentORM.id,
                    isouter=True,
                )
            case SdocColumns.SPAN_ANNOTATIONS:
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
                    ).label(SdocColumns.SPAN_ANNOTATIONS.value)
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
