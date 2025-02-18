from typing import Dict, List

from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.span_group import (
    SpanGroupCreate,
    SpanGroupCreateIntern,
    SpanGroupUpdate,
)
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.span_group import SpanAnnotationSpanGroupLinkTable, SpanGroupORM


class CRUDSpanGroup(CRUDBase[SpanGroupORM, SpanGroupCreateIntern, SpanGroupUpdate]):
    def create(
        self, db: Session, *, user_id: int, create_dto: SpanGroupCreate
    ) -> SpanGroupORM:
        # get or create the annotation document
        adoc = crud_adoc.exists_or_create(
            db=db, user_id=user_id, sdoc_id=create_dto.sdoc_id
        )

        return super().create(
            db,
            create_dto=SpanGroupCreateIntern(
                name=create_dto.name,
                annotation_document_id=adoc.id,
            ),
        )

    def read_by_user_and_sdoc(
        self,
        db: Session,
        *,
        user_id: int,
        sdoc_id: int,
        skip: int = 0,
        limit: int = 1000,
    ) -> List[SpanGroupORM]:
        query = (
            db.query(self.model)
            .join(self.model.annotation_document)
            .where(
                AnnotationDocumentORM.user_id == user_id,
                AnnotationDocumentORM.source_document_id == sdoc_id,
            )
            .offset(skip)
            .limit(limit)
        )

        return query.all()

    def link_groups_spans_batch(
        self, db: Session, *, links: Dict[int, List[int]]
    ) -> int:
        """
        Links the spans to their groups
        """

        # insert links (group <-> span)
        from sqlalchemy.dialects.postgresql import insert

        insert_values = [
            {"span_group_id": str(group_id), "span_annotation_id": str(span_id)}
            for group_id, span_ids in links.items()
            for span_id in span_ids
        ]

        insert_stmt = (
            insert(SpanAnnotationSpanGroupLinkTable)
            .on_conflict_do_nothing()
            .returning(SpanAnnotationSpanGroupLinkTable.span_group_id)
        )

        new_rows = db.execute(insert_stmt, insert_values).fetchall()
        db.commit()

        return len(new_rows)


crud_span_group = CRUDSpanGroup(SpanGroupORM)
