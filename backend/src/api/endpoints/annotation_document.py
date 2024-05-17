from typing import Dict, List, Union

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import (
    get_current_user,
    get_db_session,
    resolve_code_param,
    skip_limit_params,
)
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.span_group import crud_span_group
from app.core.data.dto.annotation_document import (
    AnnotationDocumentCreate,
    AnnotationDocumentRead,
)
from app.core.data.dto.bbox_annotation import (
    BBoxAnnotationRead,
    BBoxAnnotationReadResolvedCode,
)
from app.core.data.dto.code import CodeRead
from app.core.data.dto.span_annotation import (
    SpanAnnotationRead,
    SpanAnnotationReadResolved,
)
from app.core.data.dto.span_group import SpanGroupRead

router = APIRouter(
    prefix="/adoc",
    dependencies=[Depends(get_current_user)],
    tags=["annotationDocument"],
)


@router.put(
    "",
    response_model=AnnotationDocumentRead,
    summary="Creates an AnnotationDocument",
)
def create(
    *,
    db: Session = Depends(get_db_session),
    adoc: AnnotationDocumentCreate,
    authz_user: AuthzUser = Depends(),
) -> AnnotationDocumentRead:
    authz_user.assert_is_same_user(adoc.user_id)
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, adoc.source_document_id)

    return AnnotationDocumentRead.model_validate(
        crud_adoc.create(db=db, create_dto=adoc)
    )


@router.get(
    "/{adoc_id}",
    response_model=AnnotationDocumentRead,
    summary="Returns the AnnotationDocument with the given ID if it exists",
)
def get_by_adoc_id(
    *,
    db: Session = Depends(get_db_session),
    adoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> AnnotationDocumentRead:
    authz_user.assert_in_same_project_as(Crud.ANNOTATION_DOCUMENT, adoc_id)

    db_obj = crud_adoc.read(db=db, id=adoc_id)
    return AnnotationDocumentRead.model_validate(db_obj)


@router.delete(
    "/{adoc_id}",
    response_model=AnnotationDocumentRead,
    summary="Removes the AnnotationDocument with the given ID if it exists",
)
def delete_by_adoc_id(
    *,
    db: Session = Depends(get_db_session),
    adoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> AnnotationDocumentRead:
    authz_user.assert_in_same_project_as(Crud.ANNOTATION_DOCUMENT, adoc_id)

    db_obj = crud_adoc.remove(db=db, id=adoc_id)
    return AnnotationDocumentRead.model_validate(db_obj)


@router.get(
    "/{adoc_id}/span_annotations",
    response_model=Union[List[SpanAnnotationRead], List[SpanAnnotationReadResolved]],
    summary="Returns all SpanAnnotations in the AnnotationDocument with the given ID if it exists",
)
def get_all_span_annotations(
    *,
    db: Session = Depends(get_db_session),
    adoc_id: int,
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
) -> Union[List[SpanAnnotationRead], List[SpanAnnotationReadResolved]]:
    authz_user.assert_in_same_project_as(Crud.ANNOTATION_DOCUMENT, adoc_id)

    spans = crud_span_anno.read_by_adoc(db=db, adoc_id=adoc_id, **skip_limit)
    span_read_dtos = [SpanAnnotationRead.model_validate(span) for span in spans]
    if resolve_code:
        return [
            SpanAnnotationReadResolved(
                **span_dto.model_dump(exclude={"current_code_id", "span_text_id"}),
                code=CodeRead.model_validate(span_orm.current_code.code),
                span_text=span_orm.span_text.text,
                user_id=span_orm.annotation_document.user_id,
                sdoc_id=span_orm.annotation_document.source_document_id,
            )
            for span_orm, span_dto in zip(spans, span_read_dtos)
        ]
    else:
        return span_read_dtos


@router.delete(
    "/{adoc_id}/span_annotations",
    response_model=List[int],
    summary="Removes all SpanAnnotations in the AnnotationDocument with the given ID if it exists",
)
def delete_all_span_annotations(
    *,
    db: Session = Depends(get_db_session),
    adoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_same_project_as(Crud.ANNOTATION_DOCUMENT, adoc_id)

    # TODO Flo: What to return?
    return crud_span_anno.remove_by_adoc(db=db, adoc_id=adoc_id)


@router.get(
    "/{adoc_id}/bbox_annotations",
    response_model=Union[
        List[BBoxAnnotationRead], List[BBoxAnnotationReadResolvedCode]
    ],
    summary="Returns all BBoxAnnotations in the AnnotationDocument with the given ID if it exists",
)
def get_all_bbox_annotations(
    *,
    db: Session = Depends(get_db_session),
    adoc_id: int,
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
) -> Union[List[BBoxAnnotationRead], List[BBoxAnnotationReadResolvedCode]]:
    authz_user.assert_in_same_project_as(Crud.ANNOTATION_DOCUMENT, adoc_id)

    bboxes = crud_bbox_anno.read_by_adoc(db=db, adoc_id=adoc_id, **skip_limit)
    bbox_read_dtos = [BBoxAnnotationRead.model_validate(bbox) for bbox in bboxes]
    if resolve_code:
        return [
            BBoxAnnotationReadResolvedCode(
                **bbox_dto.model_dump(exclude={"current_code_id"}),
                code=CodeRead.model_validate(bbox_orm.current_code.code),
                user_id=bbox_orm.annotation_document.user_id,
                sdoc_id=bbox_orm.annotation_document.source_document_id,
            )
            for bbox_orm, bbox_dto in zip(bboxes, bbox_read_dtos)
        ]
    else:
        return bbox_read_dtos


@router.delete(
    "/{adoc_id}/bbox_annotations",
    response_model=List[int],
    summary="Removes all BBoxAnnotations in the AnnotationDocument with the given ID if it exists",
)
def delete_all_bbox_annotations(
    *,
    db: Session = Depends(get_db_session),
    adoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_same_project_as(Crud.ANNOTATION_DOCUMENT, adoc_id)

    # TODO Flo: What to return?
    return crud_bbox_anno.remove_by_adoc(db=db, adoc_id=adoc_id)


@router.get(
    "/{adoc_id}/span_groups",
    response_model=List[SpanGroupRead],
    summary="Returns all SpanGroups in the AnnotationDocument with the given ID if it exists",
)
def get_all_span_groups(
    *,
    db: Session = Depends(get_db_session),
    adoc_id: int,
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
    authz_user: AuthzUser = Depends(),
) -> List[SpanGroupRead]:
    authz_user.assert_in_same_project_as(Crud.ANNOTATION_DOCUMENT, adoc_id)

    return [
        SpanGroupRead.model_validate(group)
        for group in crud_span_group.read_by_adoc(db=db, adoc_id=adoc_id, **skip_limit)
    ]
