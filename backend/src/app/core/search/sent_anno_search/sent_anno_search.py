from typing import List, Optional

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.analysis import (
    SentenceAnnotationRow,
    SentenceAnnotationSearchResult,
)
from app.core.data.dto.code import CodeRead
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.db.sql_service import SQLService
from app.core.search.column_info import (
    ColumnInfo,
)
from app.core.search.filtering import Filter
from app.core.search.search_builder import SearchBuilder
from app.core.search.sent_anno_search.sent_anno_search_columns import SentAnnoColumns
from app.core.search.sorting import Sort


def find_sentence_annotations_info(
    project_id,
) -> List[ColumnInfo[SentAnnoColumns]]:
    with SQLService().db_session() as db:
        project_metadata = [
            ProjectMetadataRead.model_validate(pm)
            for pm in crud_project_meta.read_by_project(db=db, proj_id=project_id)
        ]
        metadata_column_info = [
            ColumnInfo.from_project_metadata(pm)
            for pm in project_metadata
            if pm.doctype in [DocType.text]
        ]

    return [
        ColumnInfo[SentAnnoColumns].from_column(column) for column in SentAnnoColumns
    ] + metadata_column_info


def find_sentence_annotations(
    project_id: int,
    filter: Filter[SentAnnoColumns],
    sorts: List[Sort[SentAnnoColumns]],
    page: Optional[int] = None,
    page_size: Optional[int] = None,
) -> SentenceAnnotationSearchResult:
    with SQLService().db_session() as db:
        builder = SearchBuilder(db, filter, sorts)
        # build the initial subquery that queries all necessary data for the desired output
        subquery = builder.build_subquery(
            subquery=(
                db.query(
                    SentenceAnnotationORM.id,
                ).group_by(
                    SentenceAnnotationORM.id,
                )
            )
        )
        builder.build_query(
            query=(
                db.query(
                    SentenceAnnotationORM.id,
                    SentenceAnnotationORM.sentence_id_start,
                    SentenceAnnotationORM.sentence_id_end,
                    AnnotationDocumentORM.user_id,
                )
                .add_entity(CodeORM)
                .add_entity(SourceDocumentORM)
                .join(SentenceAnnotationORM.annotation_document)
                .join(SentenceAnnotationORM.code)
                .join(AnnotationDocumentORM.source_document)
                .join(subquery, SentenceAnnotationORM.id == subquery.c.id)
                .filter(SourceDocumentORM.project_id == project_id)
            )
        )
        result_rows, total_results = builder.execute_query(
            page_number=page,
            page_size=page_size,
        )

        data = []
        for row in result_rows:
            sent_start = row[1]
            sent_end = row[2]
            sdoc_orm: SourceDocumentORM = row[5]
            data.append(
                SentenceAnnotationRow(
                    id=row[0],
                    user_id=row[3],
                    code=CodeRead.model_validate(row[4]),
                    sdoc=SourceDocumentRead.model_validate(sdoc_orm),
                    tag_ids=[tag.id for tag in sdoc_orm.document_tags],
                    text=" ".join(sdoc_orm.data.sentences[sent_start : sent_end + 1]),
                    memo=None,
                )
            )
        return SentenceAnnotationSearchResult(total_results=total_results, data=data)
