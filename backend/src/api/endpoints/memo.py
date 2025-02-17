from typing import Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from api.util import get_object_memo_for_user, get_object_memos
from api.validation import Validate
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud, MemoCrud
from app.core.data.crud.memo import crud_memo
from app.core.data.dto.memo import (
    AttachedObjectType,
    MemoCreate,
    MemoCreateIntern,
    MemoInDB,
    MemoRead,
    MemoUpdate,
)
from app.core.data.dto.search import PaginatedElasticSearchDocumentHits
from app.core.data.orm.util import get_parent_project_id
from app.core.search.column_info import ColumnInfo
from app.core.search.filtering import Filter
from app.core.search.memo_search.memo_search import memo_info, memo_search
from app.core.search.memo_search.memo_search_columns import MemoColumns
from app.core.search.sorting import Sort

router = APIRouter(
    prefix="/memo", dependencies=[Depends(get_current_user)], tags=["memo"]
)


attachedObject2Crud: Dict[AttachedObjectType, MemoCrud] = {
    AttachedObjectType.document_tag: MemoCrud.DOCUMENT_TAG,
    AttachedObjectType.source_document: MemoCrud.SOURCE_DOCUMENT,
    AttachedObjectType.code: MemoCrud.CODE,
    AttachedObjectType.bbox_annotation: MemoCrud.BBOX_ANNOTATION,
    AttachedObjectType.span_annotation: MemoCrud.SPAN_ANNOTATION,
    AttachedObjectType.sentence_annotation: MemoCrud.SENTENCE_ANNOTATION,
    AttachedObjectType.span_group: MemoCrud.SPAN_GROUP,
    AttachedObjectType.project: MemoCrud.PROJECT,
}


@router.put(
    "",
    response_model=MemoRead,
    summary="Adds a Memo to the Attached Object with the given ID if it exists",
)
def add_memo(
    *,
    db: Session = Depends(get_db_session),
    attached_object_id: int,
    attached_object_type: AttachedObjectType,
    memo: MemoCreate,
    authz_user: AuthzUser = Depends(),
    validate: Validate = Depends(),
) -> MemoRead:
    crud = attachedObject2Crud.get(attached_object_type)
    if crud is None:
        raise ValueError("Invalid attached_object_type")

    # get project id of the attached object
    attached_object = crud.value.read(db=db, id=attached_object_id)
    proj_id = get_parent_project_id(attached_object)
    if proj_id is None:
        raise ValueError("Attached object has no project")

    # check if user is authorized to add memo to the attached object
    authz_user.assert_in_project(project_id=proj_id)

    db_obj = crud_memo.create_for_attached_object(
        db=db,
        attached_object_id=attached_object_id,
        attached_object_type=attached_object_type,
        create_dto=MemoCreateIntern(
            **memo.model_dump(), user_id=authz_user.user.id, project_id=proj_id
        ),
    )
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
        attached_object_id=attached_object_id,
        attached_object_type=attached_object_type,
    )


@router.get(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Returns the Memo with the given ID if it exists",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)

    db_obj = crud_memo.read(db=db, id=memo_id)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)


@router.get(
    "/attached_obj/{attached_obj_type}/to/{attached_obj_id}",
    response_model=List[MemoRead],
    summary="Returns all Memos attached to the object if it exists",
)
def get_memos_by_attached_object_id(
    *,
    db: Session = Depends(get_db_session),
    attached_obj_id: int,
    attached_obj_type: AttachedObjectType,
    authz_user: AuthzUser = Depends(),
) -> List[MemoRead]:
    crud = attachedObject2Crud.get(attached_obj_type)
    if crud is None:
        raise ValueError("Invalid attached_object_type")

    # get project id of the attached object
    attached_object = crud.value.read(db=db, id=attached_obj_id)
    proj_id = get_parent_project_id(attached_object)
    if proj_id is None:
        raise ValueError("Attached object has no project")

    # check if user is authorized to get memo from the attached object
    authz_user.assert_in_project(project_id=proj_id)

    return get_object_memos(db_obj=attached_object)


@router.get(
    "/attached_obj/{attached_obj_type}/to/{attached_obj_id}/user",
    response_model=MemoRead,
    summary="Returns the logged-in User's Memo attached to the object if it exists",
)
def get_user_memo_by_attached_object_id(
    *,
    db: Session = Depends(get_db_session),
    attached_obj_id: int,
    attached_obj_type: AttachedObjectType,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    crud = attachedObject2Crud.get(attached_obj_type)
    if crud is None:
        raise ValueError("Invalid attached_object_type")

    # get project id of the attached object
    attached_object = crud.value.read(db=db, id=attached_obj_id)
    proj_id = get_parent_project_id(attached_object)
    if proj_id is None:
        raise ValueError("Attached object has no project")

    # check if user is authorized to get memo from the attached object
    authz_user.assert_in_project(project_id=proj_id)

    return get_object_memo_for_user(db_obj=attached_object, user_id=authz_user.user.id)


@router.patch(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Updates the Memo with the given ID if it exists",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    memo: MemoUpdate,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)

    db_obj = crud_memo.update(db=db, id=memo_id, update_dto=memo)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)


@router.delete(
    "/{memo_id}",
    response_model=MemoRead,
    summary="Removes the Memo with the given ID if it exists",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    memo_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_same_project_as(Crud.MEMO, memo_id)

    memo = crud_memo.remove(db=db, id=memo_id)

    return crud_memo.get_memo_read_dto_from_orm(db, memo)


@router.post(
    "/info",
    response_model=List[ColumnInfo[MemoColumns]],
    summary="Returns Memo Table Info.",
)
def search_memo_info(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> List[ColumnInfo[MemoColumns]]:
    authz_user.assert_in_project(project_id)

    return memo_info(project_id=project_id)


@router.post(
    "/search",
    response_model=PaginatedElasticSearchDocumentHits,
    summary="Returns all Memo Ids that match the query parameters.",
)
def search_memos(
    *,
    search_query: str,
    project_id: int,
    search_content: bool,
    page_number: int,
    page_size: int,
    filter: Filter[MemoColumns],
    sorts: List[Sort[MemoColumns]],
    authz_user: AuthzUser = Depends(),
) -> PaginatedElasticSearchDocumentHits:
    authz_user.assert_in_project(project_id)

    return memo_search(
        project_id=project_id,
        search_query=search_query,
        search_content=search_content,
        filter=filter,
        sorts=sorts,
        page_number=page_number,
        page_size=page_size,
    )
