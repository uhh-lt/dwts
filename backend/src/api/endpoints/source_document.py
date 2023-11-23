from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from api.util import get_object_memos
from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.annotation_document import AnnotationDocumentRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.memo import AttachedObjectType, MemoCreate, MemoInDB, MemoRead
from app.core.data.dto.source_document import (
    SourceDocumentRead,
    SourceDocumentUpdate,
    SourceDocumentWithDataRead,
)
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataReadResolved,
    SourceDocumentMetadataUpdate,
)
from app.core.data.dto.word_frequency import WordFrequencyRead
from app.core.data.repo.repo_service import RepoService

router = APIRouter(
    prefix="/sdoc", dependencies=[Depends(get_current_user)], tags=["sourceDocument"]
)


@router.get(
    "/{sdoc_id}",
    response_model=Optional[SourceDocumentWithDataRead],
    summary="Returns the SourceDocument",
    description="Returns the SourceDocument with the given ID if it exists",
)
async def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_if_finished: bool = True,
) -> Optional[SourceDocumentWithDataRead]:
    # TODO Flo: only if the user has access?
    if not only_if_finished:
        crud_sdoc.get_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)

    return crud_sdoc.read_with_data(db=db, id=sdoc_id)


@router.patch(
    "/{sdoc_id}",
    response_model=Optional[SourceDocumentRead],
    summary="Updates the SourceDocument",
    description="Updates the SourceDocument with the given ID.",
)
async def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    sdoc_update: SourceDocumentUpdate,
) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc.update(db=db, id=sdoc_id, update_dto=sdoc_update)
    sdoc_dto = SourceDocumentRead.from_orm(db_obj)
    return sdoc_dto


@router.delete(
    "/{sdoc_id}",
    response_model=Optional[SourceDocumentRead],
    summary="Removes the SourceDocument",
    description="Removes the SourceDocument with the given ID if it exists",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc.remove(db=db, id=sdoc_id)
    return SourceDocumentRead.model_validate(db_obj)


@router.patch(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Updates the SourceDocument",
    description="Updates the SourceDocument with the given ID.",
)
async def update_sdoc(
    *, db: Session = Depends(get_db_session), sdoc_id: int, sdoc: SourceDocumentUpdate
) -> SourceDocumentRead:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc.update(db=db, id=sdoc_id, update_dto=sdoc)
    return SourceDocumentRead.from_orm(db_obj)


@router.get(
    "/{sdoc_id}/linked_sdocs",
    response_model=List[int],
    summary="Returns the ids of SourceDocuments linked to the SourceDocument with the given id.",
    description="Returns the ids of SourceDocuments linked to the SourceDocument with the given id.",
)
async def get_linked_sdocs(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> List[int]:
    return crud_sdoc.collect_linked_sdoc_ids(db=db, sdoc_id=sdoc_id)


@router.get(
    "/{sdoc_id}/url",
    response_model=Optional[str],
    summary="Returns the URL to the original file of the SourceDocument",
    description="Returns the URL to the original file of the SourceDocument with the given ID if it exists.",
)
async def get_file_url(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    relative: Optional[bool] = True,
    webp: Optional[bool] = False,
    thumbnail: Optional[bool] = False,
) -> Optional[str]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return RepoService().get_sdoc_url(
        sdoc=SourceDocumentRead.model_validate(sdoc_db_obj),
        relative=relative,
        webp=webp,
        thumbnail=thumbnail,
    )


@router.get(
    "/{sdoc_id}/metadata",
    response_model=List[SourceDocumentMetadataReadResolved],
    summary="Returns all SourceDocumentMetadata",
    description="Returns all SourceDocumentMetadata of the SourceDocument with the given ID if it exists",
)
async def get_all_metadata(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
) -> List[SourceDocumentMetadataReadResolved]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return [
        SourceDocumentMetadataReadResolved.model_validate(meta)
        for meta in sdoc_db_obj.metadata_
    ]


@router.get(
    "/{sdoc_id}/metadata/{metadata_key}",
    response_model=Optional[SourceDocumentMetadataReadResolved],
    summary="Returns the SourceDocumentMetadata with the given Key",
    description="Returns the SourceDocumentMetadata with the given Key if it exists.",
)
async def read_metadata_by_key(
    *, db: Session = Depends(get_db_session), sdoc_id: int, metadata_key: str
) -> Optional[SourceDocumentMetadataReadResolved]:
    # TODO Flo: only if the user has access?
    crud_sdoc.exists(db=db, id=sdoc_id, raise_error=True)
    metadata_db_obj = crud_sdoc_meta.read_by_sdoc_and_key(
        db=db, sdoc_id=sdoc_id, key=metadata_key
    )
    return SourceDocumentMetadataReadResolved.model_validate(metadata_db_obj)


@router.patch(
    "/{sdoc_id}/metadata/{metadata_id}",
    response_model=Optional[SourceDocumentMetadataReadResolved],
    summary="Updates the SourceDocumentMetadata",
    description="Updates the SourceDocumentMetadata with the given ID if it exists.",
)
async def update_metadata_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    metadata_id: int,
    metadata: SourceDocumentMetadataUpdate,
) -> Optional[SourceDocumentMetadataReadResolved]:
    # TODO Flo: only if the user has access?
    crud_sdoc.exists(db=db, id=sdoc_id, raise_error=True)
    metadata_db_obj = crud_sdoc_meta.update(
        db=db, metadata_id=metadata_id, update_dto=metadata
    )
    return SourceDocumentMetadataReadResolved.model_validate(metadata_db_obj)


@router.get(
    "/{sdoc_id}/adoc/{user_id}",
    response_model=Optional[AnnotationDocumentRead],
    summary="Returns the AnnotationDocument for the SourceDocument of the User",
    description="Returns the AnnotationDocument for the SourceDocument of the User.",
)
async def get_adoc_of_user(
    *, db: Session = Depends(get_db_session), sdoc_id: int, user_id: int
) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    return AnnotationDocumentRead.model_validate(
        crud_adoc.read_by_sdoc_and_user(db=db, sdoc_id=sdoc_id, user_id=user_id)
    )


@router.get(
    "/{sdoc_id}/adoc",
    response_model=List[AnnotationDocumentRead],
    summary="Returns all AnnotationDocuments for the SourceDocument",
    description="Returns all AnnotationDocuments for the SourceDocument.",
)
async def get_all_adocs(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> List[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    return [
        AnnotationDocumentRead.model_validate(adoc)
        for adoc in crud_sdoc.read(db=db, id=sdoc_id).annotation_documents
    ]


@router.delete(
    "/{sdoc_id}/adoc",
    response_model=List[int],
    summary="Removes all AnnotationDocuments for the SourceDocument",
    description="Removes all AnnotationDocuments for the SourceDocument.",
)
async def remove_all_adocs(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> List[int]:
    # TODO Flo: only if the user has access?
    return crud_adoc.remove_by_sdoc(db=db, sdoc_id=sdoc_id)


@router.get(
    "/{sdoc_id}/tags",
    response_model=List[DocumentTagRead],
    summary="Returns all DocumentTags linked with the SourceDocument",
    description="Returns all DocumentTags linked with the SourceDocument.",
)
async def get_all_tags(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> List[DocumentTagRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return [
        DocumentTagRead.model_validate(doc_tag_db_obj)
        for doc_tag_db_obj in sdoc_db_obj.document_tags
    ]


@router.delete(
    "/{sdoc_id}/tags",
    response_model=Optional[SourceDocumentRead],
    summary="Unlinks all DocumentTags with the SourceDocument",
    description="Unlinks all DocumentTags of the SourceDocument.",
)
async def unlinks_all_tags(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.unlink_all_document_tags(db=db, id=sdoc_id)
    return SourceDocumentRead.model_validate(sdoc_db_obj)


@router.patch(
    "/{sdoc_id}/tag/{tag_id}",
    response_model=Optional[SourceDocumentRead],
    summary="Links a DocumentTag with the SourceDocument",
    description="Links a DocumentTag with the SourceDocument with the given ID if it exists",
)
async def link_tag(
    *, db: Session = Depends(get_db_session), sdoc_id: int, tag_id: int
) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.link_document_tag(db=db, sdoc_id=sdoc_id, tag_id=tag_id)
    return SourceDocumentRead.model_validate(sdoc_db_obj)


@router.delete(
    "/{sdoc_id}/tag/{tag_id}",
    response_model=Optional[SourceDocumentRead],
    summary="Unlinks the DocumentTag from the SourceDocument",
    description="Unlinks the DocumentTags from the SourceDocument.",
)
async def unlink_tag(
    *, db: Session = Depends(get_db_session), sdoc_id: int, tag_id: int
) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.unlink_document_tag(db=db, sdoc_id=sdoc_id, tag_id=tag_id)
    return SourceDocumentRead.model_validate(sdoc_db_obj)


@router.put(
    "/{sdoc_id}/memo",
    response_model=Optional[MemoRead],
    summary="Adds a Memo to the SourceDocument",
    description="Adds a Memo to the SourceDocument with the given ID if it exists",
)
async def add_memo(
    *, db: Session = Depends(get_db_session), sdoc_id: int, memo: MemoCreate
) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.create_for_sdoc(db=db, sdoc_id=sdoc_id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
        attached_object_id=sdoc_id,
        attached_object_type=AttachedObjectType.source_document,
    )


@router.get(
    "/{sdoc_id}/memo",
    response_model=List[MemoRead],
    summary="Returns all Memo attached to the SourceDocument",
    description="Returns all Memo attached to the SourceDocument with the given ID if it exists.",
)
async def get_memos(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> List[MemoRead]:
    db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return get_object_memos(db_obj=db_obj)


@router.get(
    "/{sdoc_id}/memo/{user_id}",
    response_model=Optional[MemoRead],
    summary="Returns the Memo attached to the SourceDocument of the User with the given ID",
    description=(
        "Returns the Memo attached to the SourceDocument with the given ID of the User with the"
        " given ID if it exists."
    ),
)
async def get_user_memo(
    *, db: Session = Depends(get_db_session), sdoc_id: int, user_id: int
) -> Optional[MemoRead]:
    db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return get_object_memos(db_obj=db_obj, user_id=user_id)


@router.get(
    "/{sdoc_id}/relatedmemos/{user_id}",
    response_model=List[MemoRead],
    summary=(
        "Returns the Memo attached to the SourceDocument of the User with the given ID and all memos "
        "attached to its annotations."
    ),
    description=(
        "Returns the Memo attached to the SourceDocument of the User with the given ID and all memos"
        " attached to its annotations."
    ),
)
async def get_related_user_memos(
    *, db: Session = Depends(get_db_session), sdoc_id: int, user_id: int
) -> List[MemoRead]:
    db_objs = crud_memo.read_by_user_and_sdoc(db=db, user_id=user_id, sdoc_id=sdoc_id)
    memos = [
        crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj) for db_obj in db_objs
    ]
    return memos


@router.get(
    "/{sdoc_id}/word_frequencies",
    response_model=List[WordFrequencyRead],
    summary="Returns the SourceDocument's word frequencies",
    description="Returns the SourceDocument's word frequencies with the given ID if it exists",
)
async def get_word_frequencies(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
) -> List[WordFrequencyRead]:
    sdoc = crud_sdoc.read(db=db, id=sdoc_id)
    return [WordFrequencyRead.from_orm(wf) for wf in sdoc.word_frequencies]
