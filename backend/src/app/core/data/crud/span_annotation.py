from typing import List, Optional

import srsly
from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.crud.span_group import crud_span_group
from app.core.data.crud.span_text import crud_span_text
from app.core.data.dto.action import ActionType
from app.core.data.dto.code import CodeRead
from app.core.data.dto.span_annotation import (
    SpanAnnotationCreate,
    SpanAnnotationRead,
    SpanAnnotationReadResolved,
    SpanAnnotationUpdate,
)
from app.core.data.dto.span_text import SpanTextCreate
from app.core.data.orm.span_annotation import SpanAnnotationORM
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session


class CRUDSpanAnnotation(
    CRUDBase[SpanAnnotationORM, SpanAnnotationCreate, SpanAnnotationUpdate]
):
    def create(
        self, db: Session, *, create_dto: SpanAnnotationCreate
    ) -> SpanAnnotationORM:
        # first create the SpanText
        span_text_orm = crud_span_text.create(
            db=db, create_dto=SpanTextCreate(text=create_dto.span_text)
        )

        # create the SpanAnnotation (and link the SpanText via FK)
        dto_obj_data = jsonable_encoder(create_dto.dict(exclude={"span_text"}))
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db_obj.span_text_id = span_text_orm.id
        db.add(db_obj)
        db.commit()

        # create after state
        db.refresh(db_obj)
        after_state = self._get_action_state_from_orm(db_obj=db_obj)

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=create_dto.annotation_document_id)

        # create action manually because we're not using crud base create
        self._create_action(
            db_obj=db_obj,
            action_type=ActionType.CREATE,
            after_state=after_state,
        )

        return db_obj

    def create_multi(
        self, db: Session, *, create_dtos: List[SpanAnnotationCreate]
    ) -> List[SpanAnnotationORM]:
        # first create the SpanText
        span_texts_orm = crud_span_text.create_multi(
            db=db,
            create_dtos=[
                SpanTextCreate(text=create_dto.span_text) for create_dto in create_dtos
            ],
        )

        # create the SpanAnnotation (and link the SpanText via FK)
        dto_objs_data = [
            jsonable_encoder(create_dto.dict(exclude={"span_text"}))
            for create_dto in create_dtos
        ]
        # noinspection PyArgumentList
        db_objs = [self.model(**dto_obj_data) for dto_obj_data in dto_objs_data]
        for db_obj, span_text_orm in zip(db_objs, span_texts_orm):
            db_obj.span_text_id = span_text_orm.id
        db.add_all(db_objs)
        db.commit()

        # update all affected annotation documents' timestamp
        adoc_ids = list(
            set([create_dto.annotation_document_id for create_dto in create_dtos])
        )
        for adoc_id in adoc_ids:
            crud_adoc.update_timestamp(db=db, id=adoc_id)

        # we do not create actions manually here: why?

        return db_objs

    def read_by_adoc(
        self, db: Session, *, adoc_id: int, skip: int = 0, limit: int = 1000
    ) -> List[SpanAnnotationORM]:
        query = (
            db.query(self.model)
            .where(self.model.annotation_document_id == adoc_id)
            .offset(skip)
            .limit(limit)
        )

        return query.all()

    def update(
        self, db: Session, *, id: int, update_dto: SpanAnnotationUpdate
    ) -> Optional[SpanAnnotationORM]:
        span_anno = super().update(db, id=id, update_dto=update_dto)

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=span_anno.annotation_document_id)

        return span_anno

    def remove(self, db: Session, *, id: int) -> Optional[SpanAnnotationORM]:
        span_anno = super().remove(db, id=id)

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=span_anno.annotation_document_id)

        return span_anno

    def remove_by_adoc(self, db: Session, *, adoc_id: int) -> List[int]:
        # find all span annotations to be removed
        query = db.query(self.model).filter(
            self.model.annotation_document_id == adoc_id
        )
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # create actions
        for removed_orm in removed_orms:
            before_state = self._get_action_state_from_orm(removed_orm)
            self._create_action(
                db_obj=removed_orm,
                action_type=ActionType.DELETE,
                before_state=before_state,
            )

        # delete the sdocs
        query.delete()
        db.commit()

        # update the annotation document's timestamp
        crud_adoc.update_timestamp(db=db, id=adoc_id)

        return ids

    def remove_from_all_span_groups(
        self, db: Session, span_id: int
    ) -> Optional[SpanAnnotationORM]:
        db_obj = self.read(db=db, id=span_id)
        db_obj.span_groups = []
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def add_to_span_group(
        self, db: Session, span_id: int, group_id: int
    ) -> Optional[SpanAnnotationORM]:
        span_db_obj = self.read(db=db, id=span_id)
        group_db_obj = crud_span_group.read(db=db, id=group_id)
        span_db_obj.span_groups.append(group_db_obj)
        db.add(span_db_obj)
        db.commit()
        db.refresh(span_db_obj)
        return span_db_obj

    def remove_from_span_group(
        self, db: Session, span_id: int, group_id: int
    ) -> Optional[SpanAnnotationORM]:
        span_db_obj = self.read(db=db, id=span_id)
        group_db_obj = crud_span_group.read(db=db, id=group_id)
        span_db_obj.document_tags.remove(group_db_obj)
        db.commit()
        db.refresh(span_db_obj)
        return span_db_obj

    def _get_action_user_id_from_orm(self, db_obj: SpanAnnotationORM) -> int:
        return db_obj.annotation_document.user_id

    def _get_action_state_from_orm(self, db_obj: SpanAnnotationORM) -> Optional[str]:
        return srsly.json_dumps(
            SpanAnnotationReadResolved(
                **SpanAnnotationRead.from_orm(db_obj).dict(
                    exclude={"current_code_id", "span_text_id"}
                ),
                code=CodeRead.from_orm(db_obj.current_code.code),
                span_text=db_obj.span_text.text,
            ).dict()
        )


crud_span_anno = CRUDSpanAnnotation(SpanAnnotationORM)
