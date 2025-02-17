from typing import Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session, skip_limit_params
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud.user import crud_user
from app.core.data.dto.project import ProjectRead
from app.core.data.dto.user import PublicUserRead, UserRead, UserUpdate
from app.core.data.orm.user import UserORM

router = APIRouter(
    prefix="/user", dependencies=[Depends(get_current_user)], tags=["user"]
)


@router.get(
    "/me",
    response_model=UserRead,
    summary="Returns the current (logged in) user",
)
def get_me(*, user: UserORM = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(user)


@router.get(
    "/by_id/{user_id}",
    response_model=PublicUserRead,
    summary="Returns the User with the given ID if it exists",
)
def get_by_id(*, db: Session = Depends(get_db_session), user_id: int) -> PublicUserRead:
    db_user = crud_user.read(db=db, id=user_id)
    return PublicUserRead.model_validate(db_user)


@router.get(
    "/all",
    response_model=List[PublicUserRead],
    summary="Returns all Users that exist in the system",
)
def get_all(
    *,
    db: Session = Depends(get_db_session),
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
) -> List[PublicUserRead]:
    db_objs = crud_user.read_multi(db=db, **skip_limit)
    return [PublicUserRead.model_validate(proj) for proj in db_objs]


@router.patch(
    "/",
    response_model=UserRead,
    summary="Updates the logged-in User",
)
def update_me(
    *,
    db: Session = Depends(get_db_session),
    user: UserUpdate,
    authz_user: AuthzUser = Depends(),
) -> UserRead:
    db_user = crud_user.update(db=db, id=authz_user.user.id, update_dto=user)
    return UserRead.model_validate(db_user)


@router.delete(
    "/",
    response_model=UserRead,
    summary="Removes the logged-in User",
)
def delete_me(
    *,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> UserRead:
    db_user = crud_user.remove(db=db, id=authz_user.user.id)
    return UserRead.model_validate(db_user)


@router.get(
    "/project",
    response_model=List[ProjectRead],
    summary="Returns all Projects of the logged-in User",
)
def get_user_projects(
    *,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[ProjectRead]:
    db_obj = crud_user.read(db=db, id=authz_user.user.id)
    return [ProjectRead.model_validate(proj) for proj in db_obj.projects]
