from typing import Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from api.validation import Validate
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.dto.document_tag import (
    DocumentTagCreate,
    DocumentTagRead,
    DocumentTagUpdate,
    SourceDocumentDocumentTagLinks,
    SourceDocumentDocumentTagMultiLink,
)

router = APIRouter(
    prefix="/doctag", dependencies=[Depends(get_current_user)], tags=["documentTag"]
)


@router.put(
    "",
    response_model=DocumentTagRead,
    summary="Creates a new DocumentTag and returns it with the generated ID.",
)
def create_new_doc_tag(
    *,
    db: Session = Depends(get_db_session),
    doc_tag: DocumentTagCreate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> DocumentTagRead:
    authz_user.assert_in_project(doc_tag.project_id)

    if doc_tag.parent_id is not None:
        authz_user.assert_in_same_project_as(Crud.DOCUMENT_TAG, doc_tag.parent_id)

        parent_tag = crud_document_tag.read(db, doc_tag.parent_id)
        validate.validate_condition(
            parent_tag.project_id == doc_tag.project_id,
            "Parent tag needs to be in the same project",
        )

    db_obj = crud_document_tag.create(db=db, create_dto=doc_tag)
    return DocumentTagRead.model_validate(db_obj)


@router.patch(
    "/bulk/link",
    response_model=int,
    summary="Links multiple DocumentTags with the SourceDocuments and returns the number of new Links",
)
def link_multiple_tags(
    *,
    db: Session = Depends(get_db_session),
    multi_link: SourceDocumentDocumentTagMultiLink,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> int:
    # TODO this is a little inefficient, but at the moment
    # the fronend is never sending more than one id at a time
    authz_user.assert_in_same_project_as_many(
        Crud.SOURCE_DOCUMENT, multi_link.source_document_ids
    )
    authz_user.assert_in_same_project_as_many(
        Crud.DOCUMENT_TAG, multi_link.document_tag_ids
    )

    validate.validate_objects_in_same_project(
        [(Crud.SOURCE_DOCUMENT, sdoc_id) for sdoc_id in multi_link.source_document_ids]
        + [(Crud.DOCUMENT_TAG, tag_id) for tag_id in multi_link.document_tag_ids]
    )

    return crud_document_tag.link_multiple_document_tags(
        db=db,
        sdoc_ids=multi_link.source_document_ids,
        tag_ids=multi_link.document_tag_ids,
    )


@router.delete(
    "/bulk/unlink",
    response_model=int,
    summary="Unlinks all DocumentTags with the SourceDocuments and returns the number of removed Links.",
)
def unlink_multiple_tags(
    *,
    db: Session = Depends(get_db_session),
    multi_link: SourceDocumentDocumentTagMultiLink,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> int:
    authz_user.assert_in_same_project_as_many(
        Crud.SOURCE_DOCUMENT, multi_link.source_document_ids
    )
    authz_user.assert_in_same_project_as_many(
        Crud.DOCUMENT_TAG, multi_link.document_tag_ids
    )

    validate.validate_objects_in_same_project(
        [(Crud.SOURCE_DOCUMENT, sdoc_id) for sdoc_id in multi_link.source_document_ids]
        + [(Crud.DOCUMENT_TAG, tag_id) for tag_id in multi_link.document_tag_ids]
    )

    return crud_document_tag.unlink_multiple_document_tags(
        db=db,
        sdoc_ids=multi_link.source_document_ids,
        tag_ids=multi_link.document_tag_ids,
    )


@router.patch(
    "/bulk/set",
    response_model=int,
    summary="Sets SourceDocuments' tags to the provided tags",
)
def set_document_tags_batch(
    *,
    db: Session = Depends(get_db_session),
    links: List[SourceDocumentDocumentTagLinks],
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> int:
    sdoc_ids = [link.source_document_id for link in links]
    tag_ids = list(set([tag_id for link in links for tag_id in link.document_tag_ids]))
    # TODO this is a little inefficient, but at the moment
    # the fronend is never sending more than one id at a time
    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)
    authz_user.assert_in_same_project_as_many(Crud.DOCUMENT_TAG, tag_ids)

    validate.validate_objects_in_same_project(
        [(Crud.SOURCE_DOCUMENT, sdoc_id) for sdoc_id in sdoc_ids]
        + [(Crud.DOCUMENT_TAG, tag_id) for tag_id in tag_ids]
    )

    return crud_document_tag.set_document_tags_batch(
        db=db,
        links={link.source_document_id: link.document_tag_ids for link in links},
    )


@router.patch(
    "/bulk/update",
    response_model=int,
    summary="Updates SourceDocuments' tags",
)
def update_document_tags_batch(
    *,
    db: Session = Depends(get_db_session),
    sdoc_ids: List[int],
    unlink_tag_ids: List[int],
    link_tag_ids: List[int],
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> int:
    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)
    authz_user.assert_in_same_project_as_many(Crud.DOCUMENT_TAG, link_tag_ids)

    validate.validate_objects_in_same_project(
        [(Crud.SOURCE_DOCUMENT, sdoc_id) for sdoc_id in sdoc_ids]
        + [(Crud.DOCUMENT_TAG, tag_id) for tag_id in link_tag_ids]
    )

    modifications = crud_document_tag.link_multiple_document_tags(
        db=db,
        sdoc_ids=sdoc_ids,
        tag_ids=link_tag_ids,
    )
    modifications += crud_document_tag.unlink_multiple_document_tags(
        db=db,
        sdoc_ids=sdoc_ids,
        tag_ids=unlink_tag_ids,
    )
    return modifications


@router.get(
    "/{tag_id}",
    response_model=DocumentTagRead,
    summary="Returns the DocumentTag with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    tag_id: int,
    authz_user: AuthzUser = Depends(),
) -> DocumentTagRead:
    authz_user.assert_in_same_project_as(Crud.DOCUMENT_TAG, tag_id)

    db_obj = crud_document_tag.read(db=db, id=tag_id)
    return DocumentTagRead.model_validate(db_obj)


@router.patch(
    "/{tag_id}",
    response_model=DocumentTagRead,
    summary="Updates the DocumentTag with the given ID.",
)
def update_by_id(
    *, db: Session = Depends(get_db_session), tag_id: int, doc_tag: DocumentTagUpdate
) -> DocumentTagRead:
    # TODO Flo: only if the user has access?
    db_obj = crud_document_tag.update(db=db, id=tag_id, update_dto=doc_tag)
    return DocumentTagRead.model_validate(db_obj)


@router.delete(
    "/{tag_id}",
    response_model=DocumentTagRead,
    summary="Deletes the DocumentTag with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    tag_id: int,
    authz_user: AuthzUser = Depends(),
) -> DocumentTagRead:
    authz_user.assert_in_same_project_as(Crud.DOCUMENT_TAG, tag_id)

    db_obj = crud_document_tag.remove(db=db, id=tag_id)
    return DocumentTagRead.model_validate(db_obj)


@router.get(
    "/{tag_id}/sdocs",
    response_model=List[int],
    summary=(
        "Returns all SourceDocument IDs attached to the Tag with the given ID if it exists."
    ),
)
def get_sdoc_ids_by_tag_id(
    *,
    db: Session = Depends(get_db_session),
    tag_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_same_project_as(Crud.DOCUMENT_TAG, tag_id)

    db_obj = crud_document_tag.read(db=db, id=tag_id)
    return [sdoc.id for sdoc in db_obj.source_documents]


@router.post(
    "/sdoc_counts",
    response_model=Dict[int, int],
    summary="Returns a dict of all tag ids with their count of assigned source documents, counting only source documents in the given id list",
)
async def get_sdoc_counts(
    *, db: Session = Depends(get_db_session), sdoc_ids: List[int]
) -> Dict[int, int]:
    # TODO only if the user has access
    return crud_document_tag.get_tag_sdoc_counts(db, sdoc_ids)
