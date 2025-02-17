from typing import List, Optional

from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.memo import (
    AttachedObjectType,
    MemoCreateIntern,
    MemoInDB,
    MemoRead,
    MemoUpdate,
)
from app.core.data.dto.object_handle import ObjectHandleCreate
from app.core.data.dto.search import ElasticSearchMemoCreate, ElasticSearchMemoUpdate
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
from app.core.db.elasticsearch_service import ElasticSearchService


class CRUDMemo(CRUDBase[MemoORM, MemoCreateIntern, MemoUpdate]):
    def create(self, db: Session, *, create_dto: MemoCreateIntern) -> MemoORM:
        raise NotImplementedError()

    def update(self, db: Session, *, id: int, update_dto: MemoUpdate) -> MemoORM:
        updated_memo = super().update(db, id=id, update_dto=update_dto)
        self.__update_memo_in_elasticsearch(updated_memo)
        return updated_memo

    def read_by_user_and_project(
        self,
        db: Session,
        user_id: int,
        proj_id: int,
        only_starred: Optional[bool],
    ) -> List[MemoORM]:
        if only_starred:
            return (
                db.query(self.model)
                .filter(
                    self.model.user_id == user_id,
                    self.model.project_id == proj_id,
                    self.model.starred == only_starred,
                )
                .all()
            )

        return (
            db.query(self.model)
            .filter(self.model.user_id == user_id, self.model.project_id == proj_id)
            .all()
        )

    def remove_by_user_and_project(
        self, db: Session, user_id: int, proj_id: int
    ) -> List[int]:
        # find all memos to be removed
        query = db.query(self.model).filter(
            self.model.user_id == user_id, self.model.project_id == proj_id
        )
        removed_orms = query.all()
        ids = [removed_orm.id for removed_orm in removed_orms]

        # delete the memos
        query.delete()
        db.commit()

        return ids

    def exists_for_user_and_object_handle(
        self, db: Session, *, user_id: int, attached_to_id: int
    ) -> bool:
        return (
            db.query(self.model.id)
            .filter(
                self.model.user_id == user_id,
                self.model.attached_to_id == attached_to_id,
            )
            .first()
            is not None
        )

    def __create_memo(
        self, create_dto: MemoCreateIntern, db: Session, oh_db_obj: ObjectHandleORM
    ):
        # create the Memo
        dto_obj_data = jsonable_encoder(create_dto)
        dto_obj_data["attached_to_id"] = oh_db_obj.id
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        return db_obj

    def create_for_attached_object(
        self,
        db: Session,
        attached_object_id: int,
        attached_object_type: AttachedObjectType,
        create_dto: MemoCreateIntern,
    ) -> MemoORM:
        # Flo: this is necessary to avoid circular imports.
        from app.core.data.crud.object_handle import crud_object_handle

        # create an ObjectHandle for the attached object
        oh_create_dto = None
        match attached_object_type:
            case AttachedObjectType.code:
                oh_create_dto = ObjectHandleCreate(code_id=attached_object_id)
            case AttachedObjectType.span_annotation:
                oh_create_dto = ObjectHandleCreate(
                    span_annotation_id=attached_object_id
                )
            case AttachedObjectType.sentence_annotation:
                oh_create_dto = ObjectHandleCreate(
                    sentence_annotation_id=attached_object_id
                )
            case AttachedObjectType.span_group:
                oh_create_dto = ObjectHandleCreate(span_group_id=attached_object_id)
            case AttachedObjectType.bbox_annotation:
                oh_create_dto = ObjectHandleCreate(
                    bbox_annotation_id=attached_object_id
                )
            case AttachedObjectType.source_document:
                oh_create_dto = ObjectHandleCreate(
                    source_document_id=attached_object_id
                )
            case AttachedObjectType.project:
                oh_create_dto = ObjectHandleCreate(project_id=attached_object_id)
            case AttachedObjectType.document_tag:
                oh_create_dto = ObjectHandleCreate(document_tag_id=attached_object_id)
            case _:
                raise NotImplementedError(
                    f"Unknown AttachedObjectType: {attached_object_type}"
                )
        assert oh_create_dto is not None, (
            f"Unknown AttachedObjectType: {attached_object_type}"
        )

        # create an ObjectHandle for the attached object
        oh_db_obj = crud_object_handle.create(db=db, create_dto=oh_create_dto)
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(
            memo_orm=db_obj,
            attached_object_id=attached_object_id,
            attached_object_type=attached_object_type,
        )
        return db_obj

    # TODO Flo: Not sure if this actually belongs here...
    @staticmethod
    def get_memo_read_dto_from_orm(db: Session, db_obj: MemoORM) -> MemoRead:
        # Flo: this is necessary to avoid circular imports.
        from app.core.data.crud.object_handle import crud_object_handle

        attached_to = crud_object_handle.resolve_handled_object(
            db=db, handle=db_obj.attached_to
        )
        memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
        if isinstance(attached_to, CodeORM):
            return MemoRead(
                **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.code,
            )
        elif isinstance(attached_to, SpanAnnotationORM):
            return MemoRead(
                **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.span_annotation,
            )
        elif isinstance(attached_to, SpanGroupORM):
            return MemoRead(
                **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.span_group,
            )
        elif isinstance(attached_to, BBoxAnnotationORM):
            return MemoRead(
                **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.bbox_annotation,
            )
        elif isinstance(attached_to, SourceDocumentORM):
            return MemoRead(
                **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.source_document,
            )
        elif isinstance(attached_to, ProjectORM):
            return MemoRead(
                **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.project,
            )
        elif isinstance(attached_to, DocumentTagORM):
            return MemoRead(
                **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.document_tag,
            )
        else:
            raise NotImplementedError(
                f"Unknown AttachedObjectType: {type(attached_to)}"
            )

    @staticmethod
    def __add_memo_to_elasticsearch(
        memo_orm: MemoORM,
        attached_object_id: int,
        attached_object_type: AttachedObjectType,
    ):
        esmemo = ElasticSearchMemoCreate(
            title=memo_orm.title,
            content=memo_orm.content,
            memo_id=memo_orm.id,
            project_id=memo_orm.project_id,
            user_id=memo_orm.user_id,
            attached_object_id=attached_object_id,
            attached_object_type=attached_object_type,
        )
        ElasticSearchService().add_memo_to_index(
            proj_id=memo_orm.project_id, esmemo=esmemo
        )

    @staticmethod
    def __update_memo_in_elasticsearch(
        memo_orm: MemoORM,
    ):
        update_es_dto = ElasticSearchMemoUpdate(
            memo_id=memo_orm.id,
            title=memo_orm.title,
            content=memo_orm.content,
            starred=memo_orm.starred,
        )

        ElasticSearchService().update_memo_in_index(
            proj_id=memo_orm.project_id, update=update_es_dto
        )


crud_memo = CRUDMemo(MemoORM)
