from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import (
    get_current_user,
    get_db_session,
)
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.dto.bbox_annotation import (
    BBoxAnnotationCreate,
    BBoxAnnotationRead,
    BBoxAnnotationUpdate,
)
from app.core.data.dto.code import CodeRead

router = APIRouter(
    prefix="/bbox", dependencies=[Depends(get_current_user)], tags=["bboxAnnotation"]
)


@router.put(
    "",
    response_model=BBoxAnnotationRead,
    summary="Creates a BBoxAnnotation",
)
def add_bbox_annotation(
    *,
    db: Session = Depends(get_db_session),
    bbox: BBoxAnnotationCreate,
    authz_user: AuthzUser = Depends(),
) -> BBoxAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, bbox.sdoc_id)
    authz_user.assert_in_same_project_as(Crud.CODE, bbox.code_id)

    db_obj = crud_bbox_anno.create(db=db, user_id=authz_user.user.id, create_dto=bbox)
    return BBoxAnnotationRead.model_validate(db_obj)


@router.get(
    "/{bbox_id}",
    response_model=BBoxAnnotationRead,
    summary="Returns the BBoxAnnotation with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    authz_user: AuthzUser = Depends(),
) -> BBoxAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.BBOX_ANNOTATION, bbox_id)

    db_obj = crud_bbox_anno.read(db=db, id=bbox_id)
    return BBoxAnnotationRead.model_validate(db_obj)


@router.patch(
    "/{bbox_id}",
    response_model=BBoxAnnotationRead,
    summary="Updates the BBoxAnnotation with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    bbox_anno: BBoxAnnotationUpdate,
    authz_user: AuthzUser = Depends(),
) -> BBoxAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.BBOX_ANNOTATION, bbox_id)
    authz_user.assert_in_same_project_as(Crud.CODE, bbox_anno.code_id)

    db_obj = crud_bbox_anno.update(db=db, id=bbox_id, update_dto=bbox_anno)
    return BBoxAnnotationRead.model_validate(db_obj)


@router.delete(
    "/{bbox_id}",
    response_model=BBoxAnnotationRead,
    summary="Deletes the BBoxAnnotation with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    authz_user: AuthzUser = Depends(),
) -> BBoxAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.BBOX_ANNOTATION, bbox_id)

    db_obj = crud_bbox_anno.remove(db=db, id=bbox_id)
    return BBoxAnnotationRead.model_validate(db_obj)


@router.get(
    "/{bbox_id}/code",
    response_model=CodeRead,
    summary="Returns the Code of the BBoxAnnotation with the given ID if it exists.",
)
def get_code(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    authz_user: AuthzUser = Depends(),
) -> CodeRead:
    authz_user.assert_in_same_project_as(Crud.BBOX_ANNOTATION, bbox_id)

    bbox_db_obj = crud_bbox_anno.read(db=db, id=bbox_id)
    return CodeRead.model_validate(bbox_db_obj.code)


@router.get(
    "/code/{code_id}/user",
    response_model=List[BBoxAnnotationRead],
    summary=("Returns BBoxAnnotations with the given Code of the logged-in User"),
)
def get_by_user_code(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[BBoxAnnotationRead]:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)

    db_objs = crud_bbox_anno.read_by_code_and_user(
        db=db, code_id=code_id, user_id=authz_user.user.id
    )
    return [BBoxAnnotationRead.model_validate(db_obj) for db_obj in db_objs]
