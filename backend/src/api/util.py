from typing import List, Union

from fastapi import HTTPException
from loguru import logger
from starlette import status

from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.dto.memo import AttachedObjectType, MemoInDB, MemoRead
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM

credentials_exception = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_object_memos(
    db_obj: Union[
        SourceDocumentORM,
        DocumentTagORM,
        CodeORM,
        ProjectORM,
        BBoxAnnotationORM,
        SentenceAnnotationORM,
        SpanAnnotationORM,
        SpanGroupORM,
    ],
) -> List[MemoRead]:
    if db_obj.object_handle is None:
        return []

    memo_as_in_db_dtos = [
        MemoInDB.model_validate(memo_db_obj)
        for memo_db_obj in db_obj.object_handle.attached_memos
    ]

    object_types = {
        SourceDocumentORM: AttachedObjectType.source_document,
        DocumentTagORM: AttachedObjectType.document_tag,
        CodeORM: AttachedObjectType.code,
        ProjectORM: AttachedObjectType.project,
        BBoxAnnotationORM: AttachedObjectType.bbox_annotation,
        SpanAnnotationORM: AttachedObjectType.span_annotation,
        SentenceAnnotationORM: AttachedObjectType.sentence_annotation,
        SpanGroupORM: AttachedObjectType.span_group,
    }

    memos = [
        MemoRead(
            **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
            attached_object_id=db_obj.id,
            attached_object_type=object_types[type(db_obj)],
        )
        for memo_as_in_db_dto in memo_as_in_db_dtos
    ]

    return memos


def get_object_memo_for_user(
    db_obj: Union[
        SourceDocumentORM,
        DocumentTagORM,
        CodeORM,
        ProjectORM,
        BBoxAnnotationORM,
        SentenceAnnotationORM,
        SpanAnnotationORM,
        SpanGroupORM,
    ],
    user_id: int,
) -> MemoRead:
    if db_obj.object_handle is None:
        raise NoSuchElementError(MemoORM, attached_to=type(db_obj), user_id=user_id)

    memo_as_in_db_dtos = [
        MemoInDB.model_validate(memo_db_obj)
        for memo_db_obj in db_obj.object_handle.attached_memos
        if memo_db_obj.user_id == user_id
    ]

    if len(memo_as_in_db_dtos) == 0:
        raise NoSuchElementError(MemoORM, attached_to=type(db_obj), user_id=user_id)
    elif len(memo_as_in_db_dtos) > 1:
        logger.error("More than one Memo for the specified User!")

    object_types = {
        SourceDocumentORM: AttachedObjectType.source_document,
        DocumentTagORM: AttachedObjectType.document_tag,
        CodeORM: AttachedObjectType.code,
        ProjectORM: AttachedObjectType.project,
        BBoxAnnotationORM: AttachedObjectType.bbox_annotation,
        SpanAnnotationORM: AttachedObjectType.span_annotation,
        SentenceAnnotationORM: AttachedObjectType.sentence_annotation,
        SpanGroupORM: AttachedObjectType.span_group,
    }

    # return only the first memo of a user
    # a user should only have one memo per object!
    return MemoRead(
        **memo_as_in_db_dtos[0].model_dump(exclude={"attached_to"}),
        attached_object_id=db_obj.id,
        attached_object_type=object_types[type(db_obj)],
    )
