from typing import List, Optional, Union

from api.dependencies import get_current_user, get_db_session, resolve_code_param
from api.util import get_object_memos
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
from fastapi import APIRouter, Depends
from requests import Session

router = APIRouter(prefix="/bbox", dependencies=[Depends(get_current_user)])
tags = ["bboxAnnotation"]


@router.put(
    "",
    tags=tags,
    response_model=Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]],
    summary="Creates a BBoxAnnotation",
    description="Creates a BBoxAnnotation",
)
async def add_bbox_annotation(
    *,
    db: Session = Depends(get_db_session),
    bbox: BBoxAnnotationCreateWithCodeId,
    resolve_code: bool = Depends(resolve_code_param)
) -> Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_bbox_anno.create_with_code_id(db=db, create_dto=bbox)
    bbox_dto = BBoxAnnotationRead.from_orm(db_obj)
    if resolve_code:
        return BBoxAnnotationReadResolvedCode(
            **bbox_dto.dict(exclude={"current_code_id"}),
            code=CodeRead.from_orm(db_obj.current_code.code)
        )
    else:
        return bbox_dto


@router.get(
    "/{bbox_id}",
    tags=tags,
    response_model=Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]],
    summary="Returns the BBoxAnnotation",
    description="Returns the BBoxAnnotation with the given ID.",
)
async def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    resolve_code: bool = Depends(resolve_code_param)
) -> Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_bbox_anno.read(db=db, id=bbox_id)
    bbox_dto = BBoxAnnotationRead.from_orm(db_obj)
    if resolve_code:
        return BBoxAnnotationReadResolvedCode(
            **bbox_dto.dict(exclude={"current_code_id"}),
            code=CodeRead.from_orm(db_obj.current_code.code)
        )
    else:
        return bbox_dto


@router.patch(
    "/{bbox_id}",
    tags=tags,
    response_model=Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]],
    summary="Updates the BBoxAnnotation",
    description="Updates the BBoxAnnotation with the given ID.",
)
async def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    bbox_id: int,
    bbox_anno: BBoxAnnotationUpdateWithCodeId,
    resolve_code: bool = Depends(resolve_code_param)
) -> Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_bbox_anno.update_with_code_id(db=db, id=bbox_id, update_dto=bbox_anno)
    bbox_dto = BBoxAnnotationRead.from_orm(db_obj)
    if resolve_code:
        return BBoxAnnotationReadResolvedCode(
            **bbox_dto.dict(exclude={"current_code_id"}),
            code=CodeRead.from_orm(db_obj.current_code.code)
        )
    else:
        return bbox_dto


@router.delete(
    "/{bbox_id}",
    tags=tags,
    response_model=Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]],
    summary="Deletes the BBoxAnnotation",
    description="Deletes the BBoxAnnotation with the given ID.",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), bbox_id: int
) -> Optional[Union[BBoxAnnotationRead, BBoxAnnotationReadResolvedCode]]:
    # TODO Flo: only if the user has access?
    db_obj = crud_bbox_anno.remove(db=db, id=bbox_id)
    return BBoxAnnotationRead.from_orm(db_obj)


@router.get(
    "/{bbox_id}/code",
    tags=tags,
    response_model=Optional[CodeRead],
    summary="Returns the Code of the BBoxAnnotation",
    description="Returns the Code of the BBoxAnnotation with the given ID if it exists.",
)
async def get_code(
    *, db: Session = Depends(get_db_session), bbox_id: int
) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    bbox_db_obj = crud_bbox_anno.read(db=db, id=bbox_id)
    return CodeRead.from_orm(bbox_db_obj.current_code.code)


@router.put(
    "/{bbox_id}/memo",
    tags=tags,
    response_model=Optional[MemoRead],
    summary="Adds a Memo to the BBoxAnnotation",
    description="Adds a Memo to the BBoxAnnotation with the given ID if it exists",
)
async def add_memo(
    *, db: Session = Depends(get_db_session), bbox_id: int, memo: MemoCreate
) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.create_for_bbox_annotation(
        db=db, bbox_anno_id=bbox_id, create_dto=memo
    )
    memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.dict(exclude={"attached_to"}),
        attached_object_id=bbox_id,
        attached_object_type=AttachedObjectType.bbox_annotation
    )


@router.get(
    "/{bbox_id}/memo",
    tags=tags,
    response_model=List[MemoRead],
    summary="Returns the Memo attached to the BBoxAnnotation",
    description="Returns the Memo attached to the BBoxAnnotation with the given ID if it exists.",
)
async def get_memos(
    *, db: Session = Depends(get_db_session), bbox_id: int
) -> List[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_bbox_anno.read(db=db, id=bbox_id)
    return get_object_memos(db_obj=db_obj)


@router.get(
    "/{bbox_id}/memo/{user_id}",
    tags=tags,
    response_model=List[MemoRead],
    summary="Returns the Memos attached to the BBoxAnnotation of the User with the given ID",
    description=(
        "Returns the Memos attached to the BBoxAnnotation with the given ID of the User with the"
        " given ID if it exists."
    ),
)
async def get_user_memos(
    *, db: Session = Depends(get_db_session), bbox_id: int, user_id: int
) -> List[MemoRead]:
    db_obj = crud_bbox_anno.read(db=db, id=bbox_id)
    return get_object_memos(db_obj=db_obj, user_id=user_id)
