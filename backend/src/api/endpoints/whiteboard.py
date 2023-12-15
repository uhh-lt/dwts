from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.whiteboard import crud_whiteboard
from app.core.data.dto.whiteboard import (
    WhiteboardCreate,
    WhiteboardRead,
    WhiteboardUpdate,
)

router = APIRouter(
    prefix="/whiteboard", dependencies=[Depends(get_current_user)], tags=["whiteboard"]
)


@router.put(
    "",
    response_model=WhiteboardRead,
    summary="Creates an Whiteboard",
    description="Creates an Whiteboard",
)
async def create(
    *,
    db: Session = Depends(get_db_session),
    whiteboard: WhiteboardCreate,
    authz_user: AuthzUser = Depends(),
) -> WhiteboardRead:
    authz_user.assert_in_project(whiteboard.project_id)
    authz_user.assert_is_same_user(whiteboard.user_id)

    return WhiteboardRead.model_validate(
        crud_whiteboard.create(db=db, create_dto=whiteboard)
    )


@router.get(
    "/{whiteboard_id}",
    response_model=WhiteboardRead,
    summary="Returns the Whiteboard",
    description="Returns the Whiteboard with the given ID if it exists",
)
async def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    whiteboard_id: int,
    authz_user: AuthzUser = Depends(),
) -> WhiteboardRead:
    authz_user.assert_in_same_project_as(Crud.WHITEBOARD, whiteboard_id)

    db_obj = crud_whiteboard.read(db=db, id=whiteboard_id)
    return WhiteboardRead.model_validate(db_obj)


@router.get(
    "/project/{project_id}",
    response_model=List[WhiteboardRead],
    summary="Returns Whiteboards of the Project ",
    description="Returns the Whiteboards of the Project with the given ID",
)
async def get_by_project(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[WhiteboardRead]:
    authz_user.assert_in_project(project_id)

    db_objs = crud_whiteboard.read_by_project(db=db, project_id=project_id)
    return [WhiteboardRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/project/{project_id}/user/{user_id}",
    response_model=List[WhiteboardRead],
    summary="Returns Whiteboards of the Project of the User",
    description="Returns the Whiteboard of the Project with the given ID and the User with the given ID if it exists",
)
async def get_by_project_and_user(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[WhiteboardRead]:
    authz_user.assert_in_project(project_id)

    db_objs = crud_whiteboard.read_by_project_and_user(
        db=db, project_id=project_id, user_id=user_id
    )
    return [WhiteboardRead.model_validate(db_obj) for db_obj in db_objs]


@router.patch(
    "/{whiteboard_id}",
    response_model=WhiteboardRead,
    summary="Updates the Whiteboard",
    description="Updates the Whiteboard with the given ID if it exists",
)
async def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    whiteboard_id: int,
    whiteboard: WhiteboardUpdate,
    authz_user: AuthzUser = Depends(),
) -> WhiteboardRead:
    authz_user.assert_in_same_project_as(Crud.WHITEBOARD, whiteboard_id)

    db_obj = crud_whiteboard.update(db=db, id=whiteboard_id, update_dto=whiteboard)
    return WhiteboardRead.model_validate(db_obj)


@router.delete(
    "/{whiteboard_id}",
    response_model=WhiteboardRead,
    summary="Removes the Whiteboard",
    description="Removes the Whiteboard with the given ID if it exists",
)
async def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    whiteboard_id: int,
    authz_user: AuthzUser = Depends(),
) -> WhiteboardRead:
    authz_user.assert_in_same_project_as(Crud.WHITEBOARD, whiteboard_id)

    db_obj = crud_whiteboard.remove(db=db, id=whiteboard_id)
    return WhiteboardRead.model_validate(db_obj)
