from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.span_group import crud_span_group
from app.core.data.dto.span_annotation import (
    SpanAnnotationRead,
)
from app.core.data.dto.span_group import (
    SpanGroupCreate,
    SpanGroupRead,
    SpanGroupUpdate,
)

router = APIRouter(
    prefix="/spangroup", dependencies=[Depends(get_current_user)], tags=["spanGroup"]
)


@router.put(
    "",
    response_model=Optional[SpanGroupRead],
    summary="Creates a new SpanGroup and returns it with the generated ID.",
)
def create_new_span_group(
    *,
    db: Session = Depends(get_db_session),
    span_group: SpanGroupCreate,
    authz_user: AuthzUser = Depends(),
) -> Optional[SpanGroupRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, span_group.sdoc_id)

    db_obj = crud_span_group.create(
        db=db, user_id=authz_user.user.id, create_dto=span_group
    )
    return SpanGroupRead.model_validate(db_obj)


@router.get(
    "/{span_group_id}",
    response_model=Optional[SpanGroupRead],
    summary="Returns the SpanGroup with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_group_id: int,
    authz_user: AuthzUser = Depends(),
) -> Optional[SpanGroupRead]:
    authz_user.assert_in_same_project_as(Crud.SPAN_GROUP, span_group_id)

    db_obj = crud_span_group.read(db=db, id=span_group_id)
    return SpanGroupRead.model_validate(db_obj)


@router.patch(
    "/{span_group_id}",
    response_model=Optional[SpanGroupRead],
    summary="Updates the SpanGroup with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_group_id: int,
    span_anno: SpanGroupUpdate,
    authz_user: AuthzUser = Depends(),
) -> Optional[SpanGroupRead]:
    authz_user.assert_in_same_project_as(Crud.SPAN_GROUP, span_group_id)

    db_obj = crud_span_group.update(db=db, id=span_group_id, update_dto=span_anno)
    return SpanGroupRead.model_validate(db_obj)


@router.delete(
    "/{span_group_id}",
    response_model=Optional[SpanGroupRead],
    summary="Deletes the SpanGroup with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_group_id: int,
    authz_user: AuthzUser = Depends(),
) -> Optional[SpanGroupRead]:
    authz_user.assert_in_same_project_as(Crud.SPAN_GROUP, span_group_id)

    db_obj = crud_span_group.remove(db=db, id=span_group_id)
    return SpanGroupRead.model_validate(db_obj)


@router.get(
    "/{span_group_id}/span_annotations",
    response_model=List[SpanAnnotationRead],
    summary="Returns all SpanAnnotations in the SpanGroup with the given ID if it exists",
)
def get_all_annotations(
    *,
    db: Session = Depends(get_db_session),
    span_group_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[SpanAnnotationRead]:
    authz_user.assert_in_same_project_as(Crud.SPAN_GROUP, span_group_id)

    span_group_db_obj = crud_span_group.read(db=db, id=span_group_id)
    spans = span_group_db_obj.span_annotations
    return [SpanAnnotationRead.model_validate(span) for span in spans]
