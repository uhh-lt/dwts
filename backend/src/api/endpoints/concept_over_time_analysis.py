from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from app.core.analysis.cota.service import COTAService
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud.concept_over_time_analysis import crud_cota
from app.core.data.dto.concept_over_time_analysis import (
    COTACreate,
    COTARead,
    COTARefinementHyperparameters,
    COTARefinementJobRead,
    COTAUpdate,
)
from app.core.db.redis_service import RedisService

cotas: COTAService = COTAService()
redis: RedisService = RedisService()

router = APIRouter(prefix="/cota", tags=["conceptOverTimeAnalysis"])


@router.put(
    "",
    response_model=COTARead,
    summary="Creates an ConceptOverTimeAnalysis",
    description="Creates an ConceptOverTimeAnalysis",
)
async def create(
    *, db: Session = Depends(get_db_session), cota: COTACreate
) -> COTARead:
    return cotas.create(db=db, cota_create=cota)


@router.get(
    "/{cota_id}",
    response_model=COTARead,
    summary="Returns the ConceptOverTimeAnalysis",
    description="Returns the ConceptOverTimeAnalysis with the given ID if it exists",
)
async def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    return_sentence_text: bool = False,
) -> COTARead:
    cota = cotas.read_by_id(
        db=db, cota_id=cota_id, return_sentence_text=return_sentence_text
    )
    return cota


@router.get(
    "/{project_id}/user/{user_id}",
    response_model=List[COTARead],
    summary="Returns COTAs of the Project of the User",
    description="Returns the COTA of the Project with the given ID and the User with the given ID if it exists",
)
async def get_by_project_and_user(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[COTARead]:
    authz_user.assert_in_project(project_id)

    db_objs = crud_cota.read_by_project_and_user(
        db=db, project_id=project_id, user_id=user_id
    )
    return [COTARead.model_validate(db_obj) for db_obj in db_objs]


@router.patch(
    "/{cota_id}",
    response_model=COTARead,
    summary="Updates the ConceptOverTimeAnalysis",
    description="Updates the ConceptOverTimeAnalysis with the given ID if it exists",
)
async def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    cota_upate: COTAUpdate,
    return_sentence_text: bool = False,
) -> COTARead:
    return cotas.update(
        db=db,
        cota_id=cota_id,
        cota_update=cota_upate,
        return_sentence_text=return_sentence_text,
    )


@router.post(
    "/refine/{cota_id}",
    response_model=COTARefinementJobRead,
    summary="Refines the ConceptOverTimeAnalysis",
    description="Refines the ConceptOverTimeAnalysis with the given ID if it exists",
)
async def refine_cota_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    hyperparams: Optional[COTARefinementHyperparameters] = None,
) -> COTARefinementJobRead:  # noqa: F821
    return cotas.create_and_start_refinement_job_async(
        db=db,
        cota_id=cota_id,
        hyperparams=hyperparams,
    )


@router.delete(
    "/{cota_id}",
    response_model=COTARead,
    summary="Removes the ConceptOverTimeAnalysis",
    description="Removes the ConceptOverTimeAnalysis with the given ID if it exists",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), cota_id: int
) -> COTARead:
    return cotas.delete_by_id(db=db, cota_id=cota_id)


@router.get(
    "/refine/{cota_job_id}",
    response_model=COTARefinementJobRead,
    summary="Returns the COTA Refinement Job for the given ID",
    description="Returns the COTA Refinement Job for the given ID if it exists",
)
async def get_cota_job(
    *,
    cota_job_id: str,
) -> COTARefinementJobRead:
    return redis.load_cota_job(cota_job_id)
