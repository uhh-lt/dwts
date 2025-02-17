from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from api.validation import Validate
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.code import CodeRead
from app.core.data.dto.span_annotation import (
    SpanAnnotationCreate,
    SpanAnnotationDeleted,
    SpanAnnotationRead,
    SpanAnnotationUpdate,
    SpanAnnotationUpdateBulk,
)
from app.core.data.dto.span_group import SpanGroupRead

router = APIRouter(
    prefix="/span", dependencies=[Depends(get_current_user)], tags=["spanAnnotation"]
)


@router.put(
    "",
    response_model=SpanAnnotationRead,
    summary="Creates a SpanAnnotation",
)
def add_span_annotation(
    *,
    db: Session = Depends(get_db_session),
    span: SpanAnnotationCreate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> SpanAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.CODE, span.code_id)
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, span.sdoc_id)
    validate.validate_objects_in_same_project(
        [
            (Crud.CODE, span.code_id),
            (Crud.SOURCE_DOCUMENT, span.sdoc_id),
        ]
    )

    db_obj = crud_span_anno.create(db=db, user_id=authz_user.user.id, create_dto=span)
    return SpanAnnotationRead.model_validate(db_obj)


@router.put(
    "/bulk/create",
    response_model=List[SpanAnnotationRead],
    summary="Creates SpanAnnotations in Bulk",
)
def add_span_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    spans: List[SpanAnnotationCreate],
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> List[SpanAnnotationRead]:
    for span in spans:
        authz_user.assert_in_same_project_as(Crud.CODE, span.code_id)
        authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, span.sdoc_id)
        validate.validate_objects_in_same_project(
            [
                (Crud.CODE, span.code_id),
                (Crud.SOURCE_DOCUMENT, span.sdoc_id),
            ]
        )

    db_objs = crud_span_anno.create_bulk(
        db=db, user_id=authz_user.user.id, create_dtos=spans
    )
    return [SpanAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{span_id}",
    response_model=SpanAnnotationRead,
    summary="Returns the SpanAnnotation with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    authz_user: AuthzUser = Depends(),
) -> SpanAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)

    db_obj = crud_span_anno.read(db=db, id=span_id)
    return SpanAnnotationRead.model_validate(db_obj)


@router.patch(
    "/{span_id}",
    response_model=SpanAnnotationRead,
    summary="Updates the SpanAnnotation with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    span_anno: SpanAnnotationUpdate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> SpanAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)
    authz_user.assert_in_same_project_as(Crud.CODE, span_anno.code_id)
    validate.validate_objects_in_same_project(
        [(Crud.SPAN_ANNOTATION, span_id), (Crud.CODE, span_anno.code_id)]
    )

    db_obj = crud_span_anno.update(db=db, id=span_id, update_dto=span_anno)
    return SpanAnnotationRead.model_validate(db_obj)


@router.patch(
    "/bulk/update",
    response_model=List[SpanAnnotationRead],
    summary="Updates SpanAnnotations in Bulk",
)
def update_span_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    spans: List[SpanAnnotationUpdateBulk],
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> List[SpanAnnotationRead]:
    for span in spans:
        authz_user.assert_in_same_project_as(Crud.CODE, span.code_id)
        authz_user.assert_in_same_project_as(
            Crud.SPAN_ANNOTATION, span.span_annotation_id
        )
        validate.validate_objects_in_same_project(
            [
                (Crud.CODE, span.code_id),
                (Crud.SPAN_ANNOTATION, span.span_annotation_id),
            ]
        )

    db_objs = crud_span_anno.update_bulk(db=db, update_dtos=spans)
    return [SpanAnnotationRead.model_validate(db_obj) for db_obj in db_objs]


@router.delete(
    "/{span_id}",
    response_model=SpanAnnotationDeleted,
    summary="Deletes the SpanAnnotation with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    authz_user: AuthzUser = Depends(),
) -> SpanAnnotationDeleted:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)

    db_obj = crud_span_anno.remove(db=db, id=span_id)
    return SpanAnnotationDeleted.model_validate(db_obj)


@router.get(
    "/{span_id}/code",
    response_model=CodeRead,
    summary="Returns the Code of the SpanAnnotation with the given ID if it exists.",
)
def get_code(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    authz_user: AuthzUser = Depends(),
) -> CodeRead:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)

    span_db_obj = crud_span_anno.read(db=db, id=span_id)
    return CodeRead.model_validate(span_db_obj.code)


@router.get(
    "/{span_id}/groups",
    response_model=List[SpanGroupRead],
    summary="Returns all SpanGroups that contain the the SpanAnnotation.",
)
def get_all_groups(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[SpanGroupRead]:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)

    span_db_obj = crud_span_anno.read(db=db, id=span_id)
    return [
        SpanGroupRead.model_validate(span_group_db_obj)
        for span_group_db_obj in span_db_obj.span_groups
    ]


@router.delete(
    "/{span_id}/groups",
    response_model=SpanAnnotationDeleted,
    summary="Removes the SpanAnnotation from all SpanGroups",
)
def remove_from_all_groups(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    authz_user: AuthzUser = Depends(),
) -> SpanAnnotationDeleted:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)

    span_db_obj = crud_span_anno.remove_from_all_span_groups(db=db, span_id=span_id)
    return SpanAnnotationDeleted.model_validate(span_db_obj)


@router.patch(
    "/{span_id}/group/{group_id}",
    response_model=SpanAnnotationRead,
    summary="Adds the SpanAnnotation to the SpanGroup",
)
def add_to_group(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    group_id: int,
    authz_user: AuthzUser = Depends(),
) -> SpanAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)
    authz_user.assert_in_same_project_as(Crud.SPAN_GROUP, group_id)

    sdoc_db_obj = crud_span_anno.add_to_span_group(
        db=db, span_id=span_id, group_id=group_id
    )
    return SpanAnnotationRead.model_validate(sdoc_db_obj)


@router.delete(
    "/{span_id}/group/{group_id}",
    response_model=SpanAnnotationRead,
    summary="Removes the SpanAnnotation from the SpanGroup",
)
def remove_from_group(
    *,
    db: Session = Depends(get_db_session),
    span_id: int,
    group_id: int,
    authz_user: AuthzUser = Depends(),
) -> SpanAnnotationRead:
    authz_user.assert_in_same_project_as(Crud.SPAN_ANNOTATION, span_id)
    authz_user.assert_in_same_project_as(Crud.SPAN_GROUP, group_id)

    sdoc_db_obj = crud_span_anno.remove_from_span_group(
        db=db, span_id=span_id, group_id=group_id
    )
    return SpanAnnotationRead.model_validate(sdoc_db_obj)


@router.get(
    "/code/{code_id}/user",
    response_model=List[SpanAnnotationRead],
    summary=("Returns SpanAnnotations with the given Code of the logged-in User"),
)
def get_by_user_code(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[SpanAnnotationRead]:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)

    db_objs = crud_span_anno.read_by_code_and_user(
        db=db, code_id=code_id, user_id=authz_user.user.id
    )
    return [SpanAnnotationRead.model_validate(db_obj) for db_obj in db_objs]
