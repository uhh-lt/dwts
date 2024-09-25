from typing import List, Union

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import (
    get_current_user,
    get_db_session,
    resolve_code_param,
)
from api.util import get_object_memo_for_user, get_object_memos
from api.validation import Validate
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.memo import crud_memo
from app.core.data.dto.bbox_annotation import (
    BBoxAnnotationCreateWithCodeId,
    BBoxAnnotationRead,
    BBoxAnnotationReadResolvedCode,
    BBoxAnnotationUpdateWithCodeId,
)
from app.core.data.dto.code import CodeRead
from app.core.data.dto.memo import AttachedObjectType, MemoCreate, MemoInDB, MemoRead

router = APIRouter(
    prefix="/bbox", dependencies=[Depends(get_current_user)], tags=["bboxAnnotation"]
)


@router.put(
    "",
    response_model=Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode],
    summary="Creates a BBoxAnnotation",
)
def add_bbox_annotation(
    *,
    db: Session = Depends(get_db_session),
    bbox: BBoxAnnotationCreateWithCodeId,
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
) -> Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]:
    authz_user.assert_is_same_user(bbox.user_id)
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, bbox.sdoc_id)
    authz_user.assert_in_same_project_as(Crud.CODE, bbox.code_id)

    db_obj = crud_bbox_anno.create_with_code_id(db=db, create_dto=bbox)
    bbox_dto = BBoxAnnotationRead.model_validate(db_obj)
    if resolve_code:
        return BBoxAnnotationReadResolvedCode(
            **bbox_dto.model_dump(exclude={"current_code_id"}),
            code=CodeRead.model_validate(db_obj.current_code.code),
            user_id=db_obj.annotation_document.user_id,
            sdoc_id=db_obj.annotation_document.source_document_id,
        )
    else:
        return bbox_dto


@router.get(
    "/{bbox_id}",
    response_model=Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode],
    summary="Returns the BBoxAnnotation with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
) -> Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]:
    authz_user.assert_in_same_project_as(Crud.BBOX_ANNOTATION, bbox_id)

    db_obj = crud_bbox_anno.read(db=db, id=bbox_id)
    bbox_dto = BBoxAnnotationRead.model_validate(db_obj)
    if resolve_code:
        return BBoxAnnotationReadResolvedCode(
            **bbox_dto.model_dump(exclude={"current_code_id"}),
            code=CodeRead.model_validate(db_obj.current_code.code),
            user_id=db_obj.annotation_document.user_id,
            sdoc_id=db_obj.annotation_document.source_document_id,
        )
    else:
        return bbox_dto


@router.patch(
    "/{bbox_id}",
    response_model=Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode],
    summary="Updates the BBoxAnnotation with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    bbox_anno: BBoxAnnotationUpdateWithCodeId,
    resolve_code: bool = Depends(resolve_code_param),
    authz_user: AuthzUser = Depends(),
) -> Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]:
    authz_user.assert_in_same_project_as(Crud.BBOX_ANNOTATION, bbox_id)
    authz_user.assert_in_same_project_as(Crud.CODE, bbox_anno.code_id)

    db_obj = crud_bbox_anno.update_with_code_id(db=db, id=bbox_id, update_dto=bbox_anno)
    bbox_dto = BBoxAnnotationRead.model_validate(db_obj)
    if resolve_code:
        return BBoxAnnotationReadResolvedCode(
            **bbox_dto.model_dump(exclude={"current_code_id"}),
            code=CodeRead.model_validate(db_obj.current_code.code),
            user_id=db_obj.annotation_document.user_id,
            sdoc_id=db_obj.annotation_document.source_document_id,
        )
    else:
        return bbox_dto


@router.delete(
    "/{bbox_id}",
    response_model=Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode],
    summary="Deletes the BBoxAnnotation with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    authz_user: AuthzUser = Depends(),
) -> Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]:
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

    return CodeRead.model_validate(bbox_db_obj.current_code.code)


@router.put(
    "/{bbox_id}/memo",
    response_model=MemoRead,
    summary="Adds a Memo to the BBoxAnnotation with the given ID if it exists",
)
def add_memo(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    memo: MemoCreate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> MemoRead:
    bbox_anno = crud_bbox_anno.read(db, bbox_id)
    authz_user.assert_is_same_user(memo.user_id)
    authz_user.assert_in_project(memo.project_id)
    authz_user.assert_in_project(
        bbox_anno.annotation_document.source_document.project_id
    )
    validate.validate_condition(
        bbox_anno.annotation_document.source_document.project_id == memo.project_id,
        "memo and bbox annotation project don't match",
    )

    db_obj = crud_memo.create_for_bbox_annotation(
        db=db, bbox_anno_id=bbox_id, create_dto=memo
    )
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
        attached_object_id=bbox_id,
        attached_object_type=AttachedObjectType.bbox_annotation,
    )


@router.get(
    "/{bbox_id}/memo",
    response_model=List[MemoRead],
    summary="Returns the Memos attached to the BBoxAnnotation with the given ID if it exists.",
)
def get_memos(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[MemoRead]:
    authz_user.assert_in_same_project_as(Crud.BBOX_ANNOTATION, bbox_id)

    db_obj = crud_bbox_anno.read(db=db, id=bbox_id)
    # TODO how to authorize memo access here?
    return get_object_memos(db_obj=db_obj)


@router.get(
    "/{bbox_id}/memo/{user_id}",
    response_model=MemoRead,
    summary=(
        "Returns the Memo attached to the BBoxAnnotation with the given ID of the User with the"
        " given ID if it exists."
    ),
)
def get_user_memo(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.BBOX_ANNOTATION, bbox_id)
    # no authorization for user id, any user can read
    # all memos as long as they're in the same project
    # as the annotation

    db_obj = crud_bbox_anno.read(db=db, id=bbox_id)
    return get_object_memo_for_user(db_obj=db_obj, user_id=user_id)


@router.get(
    "/code/{code_id}/user/{user_id}",
    response_model=List[BBoxAnnotationRead],
    summary=(
        "Returns BBoxAnnotations with the given Code of the User with the given ID"
    ),
)
def get_by_user_code(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[BBoxAnnotationRead]:
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)
    # no authorization for user id, any user can read
    # all annotations as long as they're in the same project

    db_objs = crud_bbox_anno.read_by_code_and_user(
        db=db, code_id=code_id, user_id=user_id
    )
    return [BBoxAnnotationRead.model_validate(db_obj) for db_obj in db_objs]
