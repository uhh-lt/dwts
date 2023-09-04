from typing import List, Optional, Union

from app.core.data.dto.memo import AttachedObjectType, MemoInDB, MemoRead
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from fastapi import HTTPException
from loguru import logger
from starlette import status

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
        SpanAnnotationORM,
    ],
    user_id: Optional[int] = None,
) -> List[MemoRead]:
    if db_obj.object_handle is None and user_id is None:
        return []

    memo_as_in_db_dtos = [
        MemoInDB.from_orm(memo_db_obj)
        for memo_db_obj in db_obj.object_handle.attached_memos
        if user_id is None or memo_db_obj.user_id == user_id
    ]

    object_types = {
        SourceDocumentORM: AttachedObjectType.source_document,
        DocumentTagORM: AttachedObjectType.document_tag,
        CodeORM: AttachedObjectType.code,
        ProjectORM: AttachedObjectType.project,
        BBoxAnnotationORM: AttachedObjectType.bbox_annotation,
        SpanAnnotationORM: AttachedObjectType.span_annotation,
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
