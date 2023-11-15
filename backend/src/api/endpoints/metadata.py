from typing import Optional

from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataCreate,
    SourceDocumentMetadataRead,
    SourceDocumentMetadataUpdate,
)
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session

router = APIRouter(
    prefix="/metadata", dependencies=[Depends(get_current_user)], tags=["metadata"]
)


@router.put(
    "",
    response_model=Optional[SourceDocumentMetadataRead],
    summary="Creates new Metadata",
    description="Creates a new Metadata and returns it with the generated ID.",
)
async def create_new_metadata(
    *, db: Session = Depends(get_db_session), metadata: SourceDocumentMetadataCreate
) -> Optional[SourceDocumentMetadataRead]:
    db_metadata = crud_sdoc_meta.create(db=db, create_dto=metadata)
    return SourceDocumentMetadataRead.model_validate(db_metadata)


@router.get(
    "/{metadata_id}",
    response_model=Optional[SourceDocumentMetadataRead],
    summary="Returns the Metadata",
    description="Returns the Metadata with the given ID.",
)
async def get_by_id(
    *, db: Session = Depends(get_db_session), metadata_id: int
) -> Optional[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc_meta.read(db=db, id=metadata_id)
    return SourceDocumentMetadataRead.model_validate(db_obj)


@router.patch(
    "/{metadata_id}",
    response_model=SourceDocumentMetadataRead,
    summary="Updates the Metadata",
    description="Updates the Metadata with the given ID.",
)
async def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    metadata: SourceDocumentMetadataUpdate,
) -> Optional[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc_meta.update(db=db, metadata_id=metadata_id, update_dto=metadata)
    return SourceDocumentMetadataRead.model_validate(db_obj)


@router.delete(
    "/{metadata_id}",
    response_model=Optional[SourceDocumentMetadataRead],
    summary="Deletes the Metadata",
    description="Deletes the Metadata with the given ID.",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), metadata_id: int
) -> Optional[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc_meta.remove(db=db, id=metadata_id)
    return SourceDocumentMetadataRead.model_validate(db_obj)
