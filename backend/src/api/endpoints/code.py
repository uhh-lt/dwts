from typing import List, Optional, Union

from api.dependencies import get_current_user, get_db_session
from app.core.data.crud.code import crud_code
from app.core.data.crud.current_code import crud_current_code
from app.core.data.crud.memo import crud_memo
from app.core.data.dto.code import CodeCreate, CodeRead, CodeUpdate
from app.core.data.dto.memo import AttachedObjectType, MemoCreate, MemoInDB, MemoRead
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/code", dependencies=[Depends(get_current_user)])
tags = ["code"]


@router.put(
    "",
    tags=tags,
    response_model=Optional[CodeRead],
    summary="Creates a new Code",
    description="Creates a new Code and returns it with the generated ID.",
)
async def create_new_code(
    *, db: Session = Depends(get_db_session), code: CodeCreate
) -> Optional[CodeRead]:
    db_code = crud_code.create(db=db, create_dto=code)
    return CodeRead.from_orm(db_code)


@router.get(
    "/current/{current_code_id}",
    tags=tags,
    response_model=Optional[CodeRead],
    summary="Returns the Code linked by the CurrentCode",
    description="Returns the Code linked by the CurrentCode with the given ID.",
)
async def get_code_by_current_code_id(
    *, db: Session = Depends(get_db_session), current_code_id: int
) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    cc_db_obj = crud_current_code.read(db=db, id=current_code_id)
    return CodeRead.from_orm(cc_db_obj.code)


@router.get(
    "/{code_id}",
    tags=tags,
    response_model=Optional[CodeRead],
    summary="Returns the Code",
    description="Returns the Code with the given ID.",
)
async def get_by_id(
    *, db: Session = Depends(get_db_session), code_id: int
) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_code.read(db=db, id=code_id)
    return CodeRead.from_orm(db_obj)


@router.patch(
    "/{code_id}",
    tags=tags,
    response_model=CodeRead,
    summary="Updates the Code",
    description="Updates the Code with the given ID.",
)
async def update_by_id(
    *, db: Session = Depends(get_db_session), code_id: int, code: CodeUpdate
) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_code.update(db=db, id=code_id, update_dto=code)
    return CodeRead.from_orm(db_obj)


@router.delete(
    "/{code_id}",
    tags=tags,
    response_model=Optional[CodeRead],
    summary="Deletes the Code",
    description="Deletes the Code with the given ID.",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), code_id: int
) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_code.remove(db=db, id=code_id)
    return CodeRead.from_orm(db_obj)


@router.patch(
    "/merge/",
    tags=tags,
    response_model=CodeRead,
    summary="Merges multiple Codes into another Code",
    description="Merges multiple Codes into another Code with the given ID.",
)
async def merge_codes(
    *,
    db: Session = Depends(get_db_session),
    code_ids_to_merge: List[int],
    merge_into_code: Union[int, CodeCreate],
    remove_merged_codes: bool = True,
) -> Optional[CodeRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_code.merge_codes(
        db=db,
        codes_to_merge=code_ids_to_merge,
        merge_into_code=merge_into_code,
        remove_merged_codes=remove_merged_codes,
    )
    return CodeRead.from_orm(db_obj)


@router.put(
    "/{code_id}/memo",
    tags=tags,
    response_model=Optional[MemoRead],
    summary="Adds a Memo to the Code",
    description="Adds a Memo to the Code with the given ID if it exists",
)
async def add_memo(
    *, db: Session = Depends(get_db_session), code_id: int, memo: MemoCreate
) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.create_for_code(db=db, code_id=code_id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.dict(exclude={"attached_to"}),
        attached_object_id=db_obj.id,
        attached_object_type=AttachedObjectType.code,
    )


@router.get(
    "/{code_id}/memo",
    tags=tags,
    response_model=List[MemoRead],
    summary="Returns the Memo attached to the Code",
    description="Returns the Memo attached to the Code with the given ID if it exists.",
)
async def get_memos(
    *, db: Session = Depends(get_db_session), code_id: int
) -> List[MemoRead]:
    db_obj = crud_code.read(db=db, id=code_id)
    return crud_memo.get_object_memos(db_obj=db_obj)


@router.get(
    "/{code_id}/memo/{user_id}",
    tags=tags,
    response_model=List[MemoRead],
    summary="Returns the Memos attached to the SpanAnnotation of the User with the given ID",
    description=(
        "Returns the Memos attached to the SpanAnnotation with the given ID of the User with the"
        " given ID if it exists."
    ),
)
async def get_user_memos(
    *, db: Session = Depends(get_db_session), code_id: int, user_id: int
) -> List[MemoRead]:
    db_obj = crud_code.read(db=db, id=code_id)
    return crud_memo.get_object_memos(db_obj=db_obj, user_id=user_id)
