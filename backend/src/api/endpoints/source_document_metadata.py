from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from api.validation import Validate
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataBulkUpdate,
    SourceDocumentMetadataCreate,
    SourceDocumentMetadataRead,
    SourceDocumentMetadataUpdate,
)

router = APIRouter(
    prefix="/sdocmeta", dependencies=[Depends(get_current_user)], tags=["sdocMetadata"]
)


@router.put(
    "",
    response_model=SourceDocumentMetadataRead,
    summary="Creates a new Metadata and returns it with the generated ID.",
)
def create_new_metadata(
    *,
    db: Session = Depends(get_db_session),
    metadata: SourceDocumentMetadataCreate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> SourceDocumentMetadataRead:
    authz_user.assert_in_same_project_as(
        Crud.PROJECT_METADATA, metadata.project_metadata_id
    )
    authz_user.assert_in_same_project_as(
        Crud.SOURCE_DOCUMENT, metadata.source_document_id
    )
    validate.validate_objects_in_same_project(
        [
            (Crud.SOURCE_DOCUMENT, metadata.source_document_id),
            (Crud.PROJECT_METADATA, metadata.project_metadata_id),
        ]
    )

    db_metadata = crud_sdoc_meta.create(db=db, create_dto=metadata)
    return SourceDocumentMetadataRead.model_validate(db_metadata)


@router.get(
    "/{metadata_id}",
    response_model=SourceDocumentMetadataRead,
    summary="Returns the Metadata with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentMetadataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT_METADATA, metadata_id)

    db_obj = crud_sdoc_meta.read(db=db, id=metadata_id)
    return SourceDocumentMetadataRead.model_validate(db_obj)


@router.patch(
    "/{metadata_id}",
    response_model=SourceDocumentMetadataRead,
    summary="Updates the Metadata with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    metadata: SourceDocumentMetadataUpdate,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentMetadataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT_METADATA, metadata_id)

    db_obj = crud_sdoc_meta.update(db=db, metadata_id=metadata_id, update_dto=metadata)
    return SourceDocumentMetadataRead.model_validate(db_obj)


@router.patch(
    "/bulk/update",
    response_model=List[SourceDocumentMetadataRead],
    summary="Updates multiple metadata objects at once.",
)
def update_bulk(
    *,
    db: Session = Depends(get_db_session),
    metadatas: List[SourceDocumentMetadataBulkUpdate],
    authz_user: AuthzUser = Depends(),
) -> List[SourceDocumentMetadataRead]:
    authz_user.assert_in_same_project_as_many(
        Crud.SOURCE_DOCUMENT_METADATA, [m.id for m in metadatas]
    )

    print("HI!")

    db_objs = crud_sdoc_meta.update_bulk(db=db, update_dtos=metadatas)
    return [SourceDocumentMetadataRead.model_validate(db_obj) for db_obj in db_objs]


@router.delete(
    "/{metadata_id}",
    response_model=SourceDocumentMetadataRead,
    summary="Deletes the Metadata with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    metadata_id: int,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentMetadataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT_METADATA, metadata_id)

    db_obj = crud_sdoc_meta.remove(db=db, id=metadata_id)
    return SourceDocumentMetadataRead.model_validate(db_obj)
