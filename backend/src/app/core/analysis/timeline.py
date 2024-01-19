from datetime import datetime
from typing import List, Tuple

import pandas as pd
from sqlalchemy import String, cast, func
from sqlalchemy.dialects.postgresql import ARRAY, array, array_agg

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.analysis import DateGroupBy, TimelineAnalysisResultNew
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM, CurrentCodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM
from app.core.db.sql_service import SQLService
from app.core.filters.columns import (
    AbstractColumns,
    ColumnInfo,
)
from app.core.filters.filtering import Filter, apply_filtering
from app.core.filters.filtering_operators import FilterOperator, FilterValueType
from app.core.search.search_service import aggregate_ids


class TimelineAnalysisColumns(str, AbstractColumns):
    SOURCE_DOCUMENT_FILENAME = "TA_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "TA_DOCUMENT_TAG_ID_LIST"
    CODE_ID_LIST = "TA_CODE_ID_LIST"
    USER_ID_LIST = "TA_USER_ID_LIST"
    SPAN_ANNOTATIONS = "TA_SPAN_ANNOTATIONS"

    def get_filter_column(self, **kwargs):
        subquery_dict = kwargs["subquery_dict"]

        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                return subquery_dict[TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST]
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return subquery_dict[TimelineAnalysisColumns.CODE_ID_LIST]
            case TimelineAnalysisColumns.USER_ID_LIST:
                return subquery_dict[TimelineAnalysisColumns.USER_ID_LIST]
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                return subquery_dict[TimelineAnalysisColumns.SPAN_ANNOTATIONS]

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterOperator.STRING
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return FilterOperator.ID_LIST
            case TimelineAnalysisColumns.USER_ID_LIST:
                return FilterOperator.ID_LIST
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                return FilterOperator.ID_LIST

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return FilterValueType.CODE_ID
            case TimelineAnalysisColumns.USER_ID_LIST:
                return FilterValueType.USER_ID
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                return FilterValueType.SPAN_ANNOTATION

    def get_sort_column(self, **kwargs):
        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                return DocumentTagORM.title
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return None
            case TimelineAnalysisColumns.USER_ID_LIST:
                return UserORM.first_name
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                return None

    def get_label(self) -> str:
        match self:
            case TimelineAnalysisColumns.SOURCE_DOCUMENT_FILENAME:
                return "Document name"
            case TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST:
                return "Tags"
            case TimelineAnalysisColumns.CODE_ID_LIST:
                return "Codes"
            case TimelineAnalysisColumns.USER_ID_LIST:
                return "Annotated by"
            case TimelineAnalysisColumns.SPAN_ANNOTATIONS:
                return "Span annotations"


def timeline_analysis_valid_documents(
    project_id: int, date_metadata_id: int
) -> Tuple[int, int]:
    with SQLService().db_session() as db:
        query = (
            db.query(func.count(SourceDocumentORM.id))
            .join(SourceDocumentORM.metadata_)
            .filter(
                SourceDocumentORM.project_id == project_id,
                SourceDocumentMetadataORM.project_metadata_id == date_metadata_id,
                SourceDocumentMetadataORM.date_value.isnot(None),
            )
        )
        sdocs_with_valid_date = query.scalar()

        query = db.query(func.count(SourceDocumentORM.id)).filter(
            SourceDocumentORM.project_id == project_id
        )
        sdocs_total = query.scalar()

    return (sdocs_with_valid_date, sdocs_total)


def timeline_analysis_info(
    project_id: int,
) -> List[ColumnInfo[TimelineAnalysisColumns]]:
    with SQLService().db_session() as db:
        metadata_column_info = crud_project_meta.create_metadata_column_info(
            db=db, project_id=project_id, allowed_doctypes=[DocType.text]
        )
    return [
        ColumnInfo[TimelineAnalysisColumns].from_column(column)
        for column in TimelineAnalysisColumns
    ] + metadata_column_info


def timeline_analysis(
    project_id: int,
    group_by: DateGroupBy,
    project_metadata_id: int,
    filter: Filter[TimelineAnalysisColumns],
) -> List[TimelineAnalysisResultNew]:
    # project_metadata_id has to refer to a DATE metadata

    with SQLService().db_session() as db:
        tag_ids_agg = aggregate_ids(
            DocumentTagORM.id, label=TimelineAnalysisColumns.DOCUMENT_TAG_ID_LIST
        )
        code_ids_agg = aggregate_ids(CodeORM.id, TimelineAnalysisColumns.CODE_ID_LIST)
        user_ids_agg = aggregate_ids(UserORM.id, TimelineAnalysisColumns.USER_ID_LIST)
        span_annotation_tuples_agg = cast(
            array_agg(
                func.distinct(array([cast(CodeORM.id, String), SpanTextORM.text])),
            ),
            ARRAY(String, dimensions=2),
        ).label(TimelineAnalysisColumns.SPAN_ANNOTATIONS)

        subquery = (
            db.query(
                SourceDocumentORM.id,
                SourceDocumentMetadataORM.date_value.label("date"),
                tag_ids_agg,
                code_ids_agg,
                user_ids_agg,
                span_annotation_tuples_agg,
            )
            .join(SourceDocumentORM.document_tags, isouter=True)
            .join(SourceDocumentORM.annotation_documents)
            .join(AnnotationDocumentORM.user)
            .join(AnnotationDocumentORM.span_annotations)
            .join(SpanAnnotationORM.span_text)
            .join(SpanAnnotationORM.current_code)
            .join(CurrentCodeORM.code)
            .join(SourceDocumentORM.metadata_)
            .filter(
                SourceDocumentORM.project_id == project_id,
                SourceDocumentMetadataORM.project_metadata_id == project_metadata_id,
                SourceDocumentMetadataORM.date_value.isnot(None),
            )
            .group_by(SourceDocumentORM.id, SourceDocumentMetadataORM.date_value)
            .subquery()
        )

        sdoc_ids_agg = aggregate_ids(SourceDocumentORM.id, label="sdoc_ids")

        query = db.query(
            sdoc_ids_agg,
            *group_by.apply(subquery.c["date"]),  # EXTRACT (WEEK FROM TIMESTAMP ...)
        ).join(subquery, SourceDocumentORM.id == subquery.c.id)

        query = apply_filtering(
            query=query, filter=filter, db=db, subquery_dict=subquery.c
        )
        query = query.group_by(*group_by.apply(column=subquery.c["date"]))

        result_rows = query.all()

        def preprend_zero(x: int):
            return "0" + str(x) if x < 10 else str(x)

        # map from date (YYYY, YYYY-MM, or YYYY-MM-DD) to num sdocs
        result_dict = {
            "-".join(map(lambda x: preprend_zero(x), row[1:])): row[0]
            for row in result_rows
        }

        # find the date range (earliest and latest date)
        datequery = (
            db.query(SourceDocumentMetadataORM.date_value)
            .join(SourceDocumentMetadataORM.source_document)
            .filter(
                SourceDocumentORM.project_id == project_id,
                SourceDocumentMetadataORM.project_metadata_id == project_metadata_id,
                SourceDocumentMetadataORM.date_value.isnot(None),
            )
            .order_by(SourceDocumentMetadataORM.date_value.asc())
        )
        date_results = [row[0] for row in datequery.all()]

        if len(date_results) == 0:
            return []

        # create a date range (used for x-axis)
        parse_str = "%Y"
        freq = "Y"
        if group_by == DateGroupBy.MONTH:
            parse_str = "%Y-%m"
            freq = "M"
        elif group_by == DateGroupBy.DAY:
            parse_str = "%Y-%m-%d"
            freq = "D"

        date_list = (
            pd.date_range(
                date_results[0], date_results[-1], freq=freq, inclusive="both"
            )
            .strftime(parse_str)
            .to_list()
        )
        date_list.append(datetime.strftime(date_results[-1], parse_str))
        date_list = sorted(list(set(date_list)))

        # prepare the result
        result = [
            TimelineAnalysisResultNew(
                sdoc_ids=result_dict[date] if date in result_dict else [],
                date=date,
            )
            for date in date_list
        ]
        return result
