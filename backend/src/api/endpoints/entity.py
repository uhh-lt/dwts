from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.entity import crud_entity
from app.core.data.dto.entity import (
    EntityMerge,
    EntityRead,
    EntityRelease,
    EntityUpdate,
)

router = APIRouter(
    prefix="/entity", dependencies=[Depends(get_current_user)], tags=["entity"]
)


@router.patch(
    "/{entity_id}",
    response_model=EntityRead,
    summary="Updates the Entity with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    entity_id: int,
    entity: EntityUpdate,
    authz_user: AuthzUser = Depends(),
) -> EntityRead:
    authz_user.assert_in_same_project_as(Crud.ENTITY, entity_id)
    entity.is_human = True
    db_obj = crud_entity.update(db=db, id=entity_id, update_dto=entity)
    return EntityRead.model_validate(db_obj)


# add merge endpoint
@router.put(
    "/merge",
    response_model=EntityRead,
    summary="Merges entities and/or span texts with given IDs.",
)
def merge_entities(
    *,
    db: Session = Depends(get_db_session),
    entity_merge: EntityMerge,
    authz_user: AuthzUser = Depends(),
) -> EntityRead:
    authz_user.assert_in_project(entity_merge.project_id)
    db_obj = crud_entity.merge(db, entity_merge=entity_merge)
    return EntityRead.model_validate(db_obj)


# add resolve endpoint
@router.put(
    "/release",
    response_model=List[EntityRead],
    summary="Releases entities and/or span texts with given IDs.",
)
def release_entities(
    *,
    db: Session = Depends(get_db_session),
    entity_release: EntityRelease,
    authz_user: AuthzUser = Depends(),
) -> List[EntityRead]:
    authz_user.assert_in_project(entity_release.project_id)
    db_objs = crud_entity.release(db=db, entity_release=entity_release)
    return [EntityRead.model_validate(db_obj) for db_obj in db_objs]
