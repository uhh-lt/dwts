from typing import List, Optional

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.analysis import (
    BBoxAnnotationRow,
    BBoxAnnotationSearchResult,
)
from app.core.data.dto.code import CodeRead
from app.core.data.dto.project_metadata import ProjectMetadataRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.core.search.bbox_anno_search.bbox_anno_search_columns import BBoxColumns
from app.core.search.column_info import (
    ColumnInfo,
)
from app.core.search.filtering import Filter
from app.core.search.search_builder import SearchBuilder
from app.core.search.sorting import Sort

repo_service = RepoService()


def find_bbox_annotations_info(project_id) -> List[ColumnInfo[BBoxColumns]]:
    with SQLService().db_session() as db:
        project_metadata = [
            ProjectMetadataRead.model_validate(pm)
            for pm in crud_project_meta.read_by_project(db=db, proj_id=project_id)
        ]
        metadata_column_info = [
            ColumnInfo.from_project_metadata(pm)
            for pm in project_metadata
            if pm.doctype
            in [
                DocType.image,
            ]
        ]

    return [
        ColumnInfo[BBoxColumns].from_column(column) for column in BBoxColumns
    ] + metadata_column_info


def find_bbox_annotations(
    project_id: int,
    filter: Filter[BBoxColumns],
    sorts: List[Sort[BBoxColumns]],
    page: Optional[int] = None,
    page_size: Optional[int] = None,
) -> BBoxAnnotationSearchResult:
    with SQLService().db_session() as db:
        builder = SearchBuilder(db, filter, sorts)
        subquery = builder.build_subquery(
            subquery=(
                db.query(
                    BBoxAnnotationORM.id,
                ).group_by(
                    BBoxAnnotationORM.id,
                )
            )
        )
        builder.build_query(
            query=(
                db.query(
                    BBoxAnnotationORM.id,
                    AnnotationDocumentORM.user_id,
                )
                .add_entity(BBoxAnnotationORM)
                .add_entity(CodeORM)
                .add_entity(SourceDocumentORM)
                .join(BBoxAnnotationORM.annotation_document)
                .join(BBoxAnnotationORM.code)
                .join(AnnotationDocumentORM.source_document)
                .join(subquery, BBoxAnnotationORM.id == subquery.c.id)
                .filter(SourceDocumentORM.project_id == project_id)
            )
        )
        result_rows, total_results = builder.execute_query(
            page_number=page,
            page_size=page_size,
        )

        data = []
        for row in result_rows:
            bbox_orm: BBoxAnnotationORM = row[2]
            code_orm: CodeORM = row[3]
            sdoc_orm: SourceDocumentORM = row[4]
            data.append(
                BBoxAnnotationRow(
                    id=row[0],
                    user_id=row[1],
                    x=bbox_orm.x_min,
                    y=bbox_orm.y_min,
                    width=bbox_orm.x_max - bbox_orm.x_min,
                    height=bbox_orm.y_max - bbox_orm.y_min,
                    url=repo_service.get_sdoc_url(
                        sdoc=SourceDocumentRead.model_validate(sdoc_orm),
                        relative=True,
                        webp=True,
                        thumbnail=False,
                    ),
                    code=CodeRead.model_validate(code_orm),
                    sdoc=SourceDocumentRead.model_validate(sdoc_orm),
                    tag_ids=[tag.id for tag in sdoc_orm.document_tags],
                    memo=None,
                )
            )
    return BBoxAnnotationSearchResult(total_results=total_results, data=data)
