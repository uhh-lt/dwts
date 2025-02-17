from typing import Optional

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.memo import crud_memo
from app.core.data.dto.code import CodeRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.span_annotation import (
    SpanAnnotationRead,
)
from app.core.data.dto.span_group import SpanGroupRead
from app.core.data.dto.user import UserRead
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM


def generate_export_df_for_memo(
    db: Session,
    memo_id: Optional[int] = None,
    memo: Optional[MemoORM] = None,
) -> pd.DataFrame:
    if memo is None:
        if memo_id is None:
            raise ValueError("Either Memo ID or ORM must be not None")
        memo = crud_memo.read(db=db, id=memo_id)

    logger.info(f"Exporting Memo {memo_id} ...")
    memo_dto = crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=memo)

    user_dto = UserRead.model_validate(memo.user)

    # get attached object
    # avoid circular imports
    from app.core.data.crud.object_handle import crud_object_handle

    assert memo.attached_to is not None
    attached_to = crud_object_handle.resolve_handled_object(
        db=db, handle=memo.attached_to
    )

    # common data
    data = {
        "memo_id": [memo_id],
        "user_id": [user_dto.id],
        "user_first_name": [user_dto.first_name],
        "user_last_name": [user_dto.last_name],
        "created": [memo_dto.created],
        "updated": [memo_dto.updated],
        "starred": [memo_dto.starred],
        "attached_to": [memo_dto.attached_object_type],
        "content": [memo_dto.content],
        "sdoc_name": [None],
        "tag_name": [None],
        "span_group_name": [None],
        "code_name": [None],
        "span_anno_text": [None],
    }

    if isinstance(attached_to, CodeORM):
        dto = CodeRead.model_validate(attached_to)
        data["code_name"] = [dto.name]

    elif isinstance(attached_to, SpanGroupORM):
        dto = SpanGroupRead.model_validate(attached_to)
        data["span_group_name"] = [dto.name]

    elif isinstance(attached_to, SourceDocumentORM):
        dto = SourceDocumentRead.model_validate(attached_to)
        data["sdoc_name"] = [dto.filename]

    elif isinstance(attached_to, DocumentTagORM):
        dto = DocumentTagRead.model_validate(attached_to)
        data["tag_name"] = [dto.name]

    elif isinstance(attached_to, SpanAnnotationORM):
        span_read_resolved_dto = SpanAnnotationRead.model_validate(attached_to)

        data["span_anno_text"] = [span_read_resolved_dto.text]
        data["code_name"] = [attached_to.code.name]

    elif isinstance(attached_to, BBoxAnnotationORM):
        data["code_name"] = [attached_to.code.name]

    elif isinstance(attached_to, ProjectORM):
        logger.warning("LogBook Export still todo!")
        pass

    df = pd.DataFrame(data=data)
    return df


def generate_export_content_for_logbook(
    db: Session, project_id: int, user_id: int
) -> str:
    logger.info(f"Exporting LogBook for User {user_id} of Project {project_id} ...")
    # FIXME find better way to get the LogBook memo (with SQL but this will be a complicated query with JOINS to resolve the objecthandle)
    memos = crud_memo.read_by_user_and_project(
        db=db, user_id=user_id, proj_id=project_id, only_starred=False
    )
    logbook_dto = None
    # avoid circular imports
    from app.core.data.crud.object_handle import crud_object_handle

    for memo in memos:
        assert memo.attached_to is not None
        # get attached object
        attached_to = crud_object_handle.resolve_handled_object(
            db=db, handle=memo.attached_to
        )
        if isinstance(attached_to, ProjectORM):
            logbook_dto = crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=memo)

    if logbook_dto is None:
        msg = f"User {user_id} has no LogBook for Project {project_id}!"
        logger.warning(msg)
        return ""

    return logbook_dto.content
