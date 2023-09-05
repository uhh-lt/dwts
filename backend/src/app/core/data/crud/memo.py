from typing import List, Optional, Union

import srsly
from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.action import ActionType
from app.core.data.dto.memo import (
    AttachedObjectType,
    MemoCreate,
    MemoInDB,
    MemoRead,
    MemoUpdate,
)
from app.core.data.dto.object_handle import ObjectHandleCreate
from app.core.data.dto.search import ElasticSearchMemoCreate, ElasticSearchMemoUpdate
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
from app.core.db.sql_service import SQLService
from app.core.search.elasticsearch_service import ElasticSearchService
from fastapi.encoders import jsonable_encoder
from sqlalchemy import and_
from sqlalchemy.orm import Session


class CRUDMemo(CRUDBase[MemoORM, MemoCreate, MemoUpdate]):
    def create(self, db: Session, *, create_dto: MemoCreate) -> MemoORM:
        raise NotImplementedError()

    def update(
        self, db: Session, *, id: int, update_dto: MemoUpdate
    ) -> Optional[MemoORM]:
        updated_memo = super().update(db, id=id, update_dto=update_dto)
        if updated_memo is not None:
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

    def read_by_user_and_sdoc(
        self, db: Session, user_id: int, sdoc_id: int
    ) -> List[MemoORM]:
        # SELECT m
        # FROM memo m
        #     JOIN objecthandle o on o.id = m.attached_to_id
        #     JOIN spanannotation span on span.id = o.span_annotation_id
        #     JOIN annotationdocument a on a.id = span.annotation_document_id
        # WHERE a.user_id = 1 AND a.source_document_id = 1

        query = (
            db.query(self.model)
            .join(ObjectHandleORM, ObjectHandleORM.id == MemoORM.attached_to_id)
            .join(
                SpanAnnotationORM,
                SpanAnnotationORM.id == ObjectHandleORM.span_annotation_id,
            )
            .join(
                AnnotationDocumentORM,
                AnnotationDocumentORM.id == SpanAnnotationORM.annotation_document_id,
            )
        )

        query = query.filter(
            and_(
                MemoORM.user_id == user_id,
                AnnotationDocumentORM.source_document_id == sdoc_id,
            )
        )

        span_memos = query.all()

        query = (
            db.query(self.model)
            .join(ObjectHandleORM, ObjectHandleORM.id == MemoORM.attached_to_id)
            .join(
                BBoxAnnotationORM,
                BBoxAnnotationORM.id == ObjectHandleORM.bbox_annotation_id,
            )
            .join(
                AnnotationDocumentORM,
                AnnotationDocumentORM.id == BBoxAnnotationORM.annotation_document_id,
            )
        )

        query = query.filter(
            and_(
                MemoORM.user_id == user_id,
                AnnotationDocumentORM.source_document_id == sdoc_id,
            )
        )

        bbox_memos = query.all()

        query = (
            db.query(self.model)
            .join(ObjectHandleORM, ObjectHandleORM.id == MemoORM.attached_to_id)
            .join(
                SourceDocumentORM,
                SourceDocumentORM.id == ObjectHandleORM.source_document_id,
            )
        )

        query = query.filter(
            and_(SourceDocumentORM.id == sdoc_id, self.model.user_id == user_id)
        )

        sdoc_memo = query.all()

        return span_memos + bbox_memos + sdoc_memo

    def remove_by_user_and_project(
        self, db: Session, user_id: int, proj_id: int
    ) -> List[int]:
        # find all memos to be removed
        query = db.query(self.model).filter(
            self.model.user_id == user_id, self.model.project_id == proj_id
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

        # delete the adocs
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
        self, create_dto: MemoCreate, db: Session, oh_db_obj: ObjectHandleORM
    ):
        # create the Memo
        dto_obj_data = jsonable_encoder(create_dto)
        dto_obj_data["attached_to_id"] = oh_db_obj.id
        # noinspection PyArgumentList
        db_obj = self.model(**dto_obj_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        # create action
        after_state = self._get_action_state_from_orm(db_obj)
        self._create_action(
            db_obj=db_obj, action_type=ActionType.CREATE, after_state=after_state
        )
        return db_obj

    def create_for_code(
        self, db: Session, code_id: int, create_dto: MemoCreate
    ) -> MemoORM:
        # Flo: this is necessary to avoid circular imports.
        from app.core.data.crud.object_handle import crud_object_handle

        # create an ObjectHandle for the Code
        oh_db_obj = crud_object_handle.create(
            db=db, create_dto=ObjectHandleCreate(code_id=code_id)
        )
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(
            memo_orm=db_obj,
            attached_object_id=code_id,
            attached_object_type=AttachedObjectType.code,
        )
        return db_obj

    def create_for_project(
        self, db: Session, project_id: int, create_dto: MemoCreate
    ) -> MemoORM:
        # Flo: this is necessary to avoid circular imports.
        from app.core.data.crud.object_handle import crud_object_handle

        # create an ObjectHandle for the Project
        oh_db_obj = crud_object_handle.create(
            db=db, create_dto=ObjectHandleCreate(project_id=project_id)
        )
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(
            memo_orm=db_obj,
            attached_object_id=project_id,
            attached_object_type=AttachedObjectType.project,
        )
        return db_obj

    def create_for_sdoc(
        self, db: Session, sdoc_id: int, create_dto: MemoCreate
    ) -> MemoORM:
        # Flo: this is necessary to avoid circular imports.
        from app.core.data.crud.object_handle import crud_object_handle

        # create an ObjectHandle for the SourceDocument
        oh_db_obj = crud_object_handle.create(
            db=db, create_dto=ObjectHandleCreate(source_document_id=sdoc_id)
        )
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(
            memo_orm=db_obj,
            attached_object_id=sdoc_id,
            attached_object_type=AttachedObjectType.source_document,
        )
        return db_obj

    def create_for_adoc(
        self, db: Session, adoc_id: int, create_dto: MemoCreate
    ) -> MemoORM:
        # Flo: this is necessary to avoid circular imports.
        from app.core.data.crud.object_handle import crud_object_handle

        # create an ObjectHandle for the AnnotationDocument
        oh_db_obj = crud_object_handle.create(
            db=db, create_dto=ObjectHandleCreate(annotation_document_id=adoc_id)
        )
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(
            memo_orm=db_obj,
            attached_object_id=adoc_id,
            attached_object_type=AttachedObjectType.annotation_document,
        )
        return db_obj

    def create_for_span_annotation(
        self, db: Session, span_anno_id: int, create_dto: MemoCreate
    ) -> MemoORM:
        # Flo: this is necessary to avoid circular imports.
        from app.core.data.crud.object_handle import crud_object_handle

        # create an ObjectHandle for the SpanAnnotation
        oh_db_obj = crud_object_handle.create(
            db=db,
            create_dto=ObjectHandleCreate(span_annotation_id=span_anno_id),
        )
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(
            memo_orm=db_obj,
            attached_object_id=span_anno_id,
            attached_object_type=AttachedObjectType.span_annotation,
        )
        return db_obj

    def create_for_span_group(
        self, db: Session, span_group_id: int, create_dto: MemoCreate
    ) -> MemoORM:
        # Flo: this is necessary to avoid circular imports.
        from app.core.data.crud.object_handle import crud_object_handle

        # create an ObjectHandle for the SpanGroup
        oh_db_obj = crud_object_handle.create(
            db=db, create_dto=ObjectHandleCreate(span_group_id=span_group_id)
        )
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(
            memo_orm=db_obj,
            attached_object_id=span_group_id,
            attached_object_type=AttachedObjectType.span_group,
        )
        return db_obj

    def create_for_bbox_annotation(
        self, db: Session, bbox_anno_id: int, create_dto: MemoCreate
    ) -> MemoORM:
        # Flo: this is necessary to avoid circular imports.
        from app.core.data.crud.object_handle import crud_object_handle

        # create an ObjectHandle for the BBoxAnnotation
        oh_db_obj = crud_object_handle.create(
            db=db,
            create_dto=ObjectHandleCreate(bbox_annotation_id=bbox_anno_id),
        )
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(
            memo_orm=db_obj,
            attached_object_id=bbox_anno_id,
            attached_object_type=AttachedObjectType.bbox_annotation,
        )
        return db_obj

    def create_for_document_tag(
        self, db: Session, doc_tag_id: int, create_dto: MemoCreate
    ) -> MemoORM:
        # Flo: this is necessary to avoid circular imports.
        from app.core.data.crud.object_handle import crud_object_handle

        # create an ObjectHandle for the DocumentTag
        oh_db_obj = crud_object_handle.create(
            db=db, create_dto=ObjectHandleCreate(document_tag_id=doc_tag_id)
        )
        db_obj = self.__create_memo(create_dto, db, oh_db_obj)
        self.__add_memo_to_elasticsearch(
            memo_orm=db_obj,
            attached_object_id=doc_tag_id,
            attached_object_type=AttachedObjectType.document_tag,
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
        memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
        if isinstance(attached_to, CodeORM):
            return MemoRead(
                **memo_as_in_db_dto.dict(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.code,
            )
        elif isinstance(attached_to, SpanAnnotationORM):
            return MemoRead(
                **memo_as_in_db_dto.dict(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.span_annotation,
            )
        elif isinstance(attached_to, SpanGroupORM):
            return MemoRead(
                **memo_as_in_db_dto.dict(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.span_group,
            )
        elif isinstance(attached_to, BBoxAnnotationORM):
            return MemoRead(
                **memo_as_in_db_dto.dict(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.bbox_annotation,
            )
        elif isinstance(attached_to, AnnotationDocumentORM):
            return MemoRead(
                **memo_as_in_db_dto.dict(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.annotation_document,
            )
        elif isinstance(attached_to, SourceDocumentORM):
            return MemoRead(
                **memo_as_in_db_dto.dict(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.source_document,
            )
        elif isinstance(attached_to, ProjectORM):
            return MemoRead(
                **memo_as_in_db_dto.dict(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.project,
            )
        elif isinstance(attached_to, DocumentTagORM):
            return MemoRead(
                **memo_as_in_db_dto.dict(exclude={"attached_to"}),
                attached_object_id=attached_to.id,
                attached_object_type=AttachedObjectType.document_tag,
            )
        else:
            raise NotImplementedError(
                f"Unknown AttachedObjectType: {type(attached_to)}"
            )

    @staticmethod
    def get_object_memos(
        db_obj: Union[
            SourceDocumentORM,
            AnnotationDocumentORM,
            DocumentTagORM,
            CodeORM,
            ProjectORM,
            BBoxAnnotationORM,
            SpanAnnotationORM,
            SpanGroupORM,
        ],
        user_id: Optional[int] = None,
    ) -> List[MemoRead]:
        if db_obj.object_handle is None:
            return []

        memo_as_in_db_dtos = [
            MemoInDB.from_orm(memo_db_obj)
            for memo_db_obj in db_obj.object_handle.attached_memos
            if user_id is None or memo_db_obj.user_id == user_id
        ]

        object_types = {
            SourceDocumentORM: AttachedObjectType.source_document,
            AnnotationDocumentORM: AttachedObjectType.annotation_document,
            DocumentTagORM: AttachedObjectType.document_tag,
            CodeORM: AttachedObjectType.code,
            ProjectORM: AttachedObjectType.project,
            BBoxAnnotationORM: AttachedObjectType.bbox_annotation,
            SpanAnnotationORM: AttachedObjectType.span_annotation,
            SpanGroupORM: AttachedObjectType.span_group,
        }

        memos = [
            MemoRead(
                **memo_as_in_db_dto.dict(exclude={"attached_to"}),
                attached_object_id=db_obj.id,
                attached_object_type=object_types[type(db_obj)],
            )
            for memo_as_in_db_dto in memo_as_in_db_dtos
        ]

        return memos

    def reattach_memo(
        self,
        db: Session,
        *,
        memo_id: int,
        attach_to_oh: ObjectHandleORM,
        attach_to_object_id: int,
        attach_to_object_type: AttachedObjectType,
    ) -> Optional[MemoORM]:
        memo = self.read(db=db, id=memo_id)
        if memo.attached_to_id == attach_to_oh.id:
            return memo
        before_state = self._get_action_state_from_orm(db_obj=memo)

        if (
            (
                attach_to_object_type == AttachedObjectType.annotation_document
                and attach_to_object_id != attach_to_oh.annotation_document_id
            )
            or (
                attach_to_object_type == AttachedObjectType.source_document
                and attach_to_object_id != attach_to_oh.source_document_id
            )
            or (
                attach_to_object_type == AttachedObjectType.document_tag
                and attach_to_object_id != attach_to_oh.document_tag_id
            )
            or (
                attach_to_object_type == AttachedObjectType.project
                and attach_to_object_id != attach_to_oh.project_id
            )
            or (
                attach_to_object_type == AttachedObjectType.code
                and attach_to_object_id != attach_to_oh.code_id
            )
            or (
                attach_to_object_type == AttachedObjectType.span_annotation
                and attach_to_object_id != attach_to_oh.span_annotation_id
            )
            or (
                attach_to_object_type == AttachedObjectType.span_group
                and attach_to_object_id != attach_to_oh.span_group_id
            )
            or (
                attach_to_object_type == AttachedObjectType.bbox_annotation
                and attach_to_object_id != attach_to_oh.bbox_annotation_id
            )
        ):
            raise ValueError(
                f"ObjectHandle {attach_to_oh.id} is not attached to the correct"
                f"object of type {attach_to_object_type} with ID {attach_to_object_id}!"
            )

        memo.attached_to_id = attach_to_oh.id

        db.commit()
        db.refresh(memo)

        # create the action manually since we are not using the crud base update
        after_state = self._get_action_state_from_orm(db_obj=memo)
        self._create_action(
            db_obj=memo,
            action_type=ActionType.UPDATE,
            before_state=before_state,
            after_state=after_state,
        )

        self.__update_memo_in_elasticsearch(
            memo_orm=memo,
            attach_to_object_id=attach_to_object_id,
            attach_to_object_type=attach_to_object_type,
        )

        return memo

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
        attach_to_object_id: Optional[int] = None,
        attach_to_object_type: Optional[AttachedObjectType] = None,
    ):
        update_es_dto = ElasticSearchMemoUpdate(
            memo_id=memo_orm.id,
            title=memo_orm.title,
            content=memo_orm.content,
            starred=memo_orm.starred,
        )

        if attach_to_object_type is not None and attach_to_object_id is not None:
            update_es_dto.attached_object_id = attach_to_object_id
            update_es_dto.attached_object_type = attach_to_object_type

        ElasticSearchService().update_memo_in_index(
            proj_id=memo_orm.project_id, update=update_es_dto
        )

    def _get_action_user_id_from_orm(self, db_obj: MemoORM) -> int:
        return db_obj.user_id

    def _get_action_state_from_orm(self, db_obj: MemoORM) -> Optional[str]:
        # TODO ASK FLO: HOW do i get db obj here?
        with SQLService().db_session() as db:
            return srsly.json_dumps(
                self.get_memo_read_dto_from_orm(db=db, db_obj=db_obj).dict()
            )


crud_memo = CRUDMemo(MemoORM)
