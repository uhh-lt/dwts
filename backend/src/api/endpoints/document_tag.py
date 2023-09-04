from typing import List, Optional

from api.dependencies import get_current_user, get_db_session
from api.util import get_object_memos
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.memo import crud_memo
from app.core.data.dto.document_tag import (
    DocumentTagCreate,
    DocumentTagRead,
    DocumentTagUpdate,
    SourceDocumentDocumentTagMultiLink,
)
from app.core.data.dto.memo import AttachedObjectType, MemoCreate, MemoInDB, MemoRead
from app.core.data.dto.source_document import SourceDocumentRead
from fastapi import APIRouter, Depends
from requests import Session

router = APIRouter(prefix="/doctag", dependencies=[Depends(get_current_user)])
tags = ["documentTag"]


@router.put(
    "",
    tags=tags,
    response_model=Optional[DocumentTagRead],
    summary="Creates a new DocumentTag",
    description="Creates a new DocumentTag and returns it with the generated ID.",
)
async def create_new_doc_tag(
    *, db: Session = Depends(get_db_session), doc_tag: DocumentTagCreate
) -> Optional[DocumentTagRead]:
    db_obj = crud_document_tag.create(db=db, create_dto=doc_tag)
    return DocumentTagRead.from_orm(db_obj)


@router.patch(
    "/bulk/link",
    tags=tags,
    response_model=int,
    summary="Links multiple DocumentTags with the SourceDocuments",
    description="Links multiple DocumentTags with the SourceDocuments and returns the number of new Links",
)
async def link_multiple_tags(
    *,
    db: Session = Depends(get_db_session),
    multi_link: SourceDocumentDocumentTagMultiLink
) -> int:
    # TODO Flo: only if the user has access?
    return crud_document_tag.link_multiple_document_tags(
        db=db,
        sdoc_ids=multi_link.source_document_ids,
        tag_ids=multi_link.document_tag_ids,
    )


@router.delete(
    "/bulk/unlink",
    tags=tags,
    response_model=int,
    summary="Unlinks all DocumentTags with the SourceDocuments",
    description="Unlinks all DocumentTags with the SourceDocuments and returns the number of removed Links.",
)
async def unlink_multiple_tags(
    *,
    db: Session = Depends(get_db_session),
    multi_link: SourceDocumentDocumentTagMultiLink
) -> int:
    # TODO Flo: only if the user has access?
    return crud_document_tag.unlink_multiple_document_tags(
        db=db,
        sdoc_ids=multi_link.source_document_ids,
        tag_ids=multi_link.document_tag_ids,
    )


@router.get(
    "/{tag_id}",
    tags=tags,
    response_model=Optional[DocumentTagRead],
    summary="Returns the DocumentTag",
    description="Returns the DocumentTag with the given ID.",
)
async def get_by_id(
    *, db: Session = Depends(get_db_session), tag_id: int
) -> Optional[DocumentTagRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_document_tag.read(db=db, id=tag_id)
    return DocumentTagRead.from_orm(db_obj)


@router.patch(
    "/{tag_id}",
    tags=tags,
    response_model=Optional[DocumentTagRead],
    summary="Updates the DocumentTag",
    description="Updates the DocumentTag with the given ID.",
)
async def update_by_id(
    *, db: Session = Depends(get_db_session), tag_id: int, doc_tag: DocumentTagUpdate
) -> Optional[DocumentTagRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_document_tag.update(db=db, id=tag_id, update_dto=doc_tag)
    return DocumentTagRead.from_orm(db_obj)


@router.delete(
    "/{tag_id}",
    tags=tags,
    response_model=Optional[DocumentTagRead],
    summary="Deletes the DocumentTag",
    description="Deletes the DocumentTag with the given ID.",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), tag_id: int
) -> Optional[DocumentTagRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_document_tag.remove(db=db, id=tag_id)
    return DocumentTagRead.from_orm(db_obj)


@router.put(
    "/{tag_id}/memo",
    tags=tags,
    response_model=Optional[MemoRead],
    summary="Adds a Memo to the DocumentTag",
    description="Adds a Memo to the DocumentTag with the given ID if it exists",
)
async def add_memo(
    *, db: Session = Depends(get_db_session), tag_id: int, memo: MemoCreate
) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.create_for_document_tag(
        db=db, doc_tag_id=tag_id, create_dto=memo
    )
    memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.dict(exclude={"attached_to"}),
        attached_object_id=tag_id,
        attached_object_type=AttachedObjectType.document_tag
    )


@router.get(
    "/{tag_id}/memo",
    tags=tags,
    response_model=List[MemoRead],
    summary="Returns the Memo attached to the DocumentTag",
    description="Returns the Memo attached to the DocumentTag with the given ID if it exists.",
)
async def get_memos(
    *, db: Session = Depends(get_db_session), tag_id: int
) -> List[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_document_tag.read(db=db, id=tag_id)
    return get_object_memos(db_obj=db_obj)


@router.get(
    "/{tag_id}/memo/{user_id}",
    tags=tags,
    response_model=List[MemoRead],
    summary="Returns the Memos attached to the DocumentTag of the User with the given ID",
    description=(
        "Returns the Memos attached to the DocumentTag with the given ID of the User with the"
        " given ID if it exists."
    ),
)
async def get_user_memos(
    *, db: Session = Depends(get_db_session), tag_id: int, user_id: int
) -> List[MemoRead]:
    db_obj = crud_document_tag.read(db=db, id=tag_id)
    return get_object_memos(db_obj=db_obj, user_id=user_id)


@router.get(
    "/{tag_id}/sdocs",
    tags=tags,
    response_model=List[SourceDocumentRead],
    summary="Returns all SourceDocuments attached to the Tag with the given ID",
    description=(
        "Returns all SourceDocuments attached to the Tag with the given ID if it exists."
    ),
)
async def get_sdocs_by_tag_id(
    *, db: Session = Depends(get_db_session), tag_id: int
) -> List[SourceDocumentRead]:
    db_obj = crud_document_tag.read(db=db, id=tag_id)
    return [SourceDocumentRead.from_orm(sdoc) for sdoc in db_obj.source_documents]
