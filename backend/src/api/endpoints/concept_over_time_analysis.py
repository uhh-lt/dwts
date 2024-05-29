from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from app.core.analysis.cota.service import COTAService
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.concept_over_time_analysis import crud_cota
from app.core.data.dto.concept_over_time_analysis import (
    COTACreate,
    COTARead,
    COTARefinementHyperparameters,
    COTARefinementJobRead,
    COTASentenceID,
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
) -> COTARead:
    cota = cotas.read_by_id(db=db, cota_id=cota_id)
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
        db=db, project_id=project_id, user_id=user_id, raise_error=False
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
) -> COTARead:
    return cotas.update(
        db=db,
        cota_id=cota_id,
        cota_update=cota_upate,
    )


@router.post(
    "/duplicate/{cota_id}",
    response_model=COTARead,
    summary="Duplicates the ConceptOverTimeAnalysis with the given ID if it exists",
)
def duplicate_by_id(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    authz_user: AuthzUser = Depends(),
) -> COTARead:
    authz_user.assert_in_same_project_as(Crud.COTA_ANALYSIS, cota_id)

    db_obj = crud_cota.duplicate_by_id(
        db=db, cota_id=cota_id, user_id=authz_user.user.id
    )
    return COTARead.model_validate(db_obj)


@router.post(
    "/annotate/{cota_id}",
    response_model=COTARead,
    summary="Annotate (multiple) COTASentences",
)
async def annotate_cota_sentence(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    cota_sentence_ids: List[COTASentenceID],
    concept_id: Optional[str] = None,
) -> COTARead:  # noqa: F821
    return cotas.annotate_sentences(
        db=db,
        cota_id=cota_id,
        cota_sentence_ids=cota_sentence_ids,
        concept_id=concept_id,
    )


@router.post(
    "/remove/{cota_id}",
    response_model=COTARead,
    summary="Remove (multiple) COTASentences from the search space",
)
async def remove_cota_sentence(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
    cota_sentence_ids: List[COTASentenceID],
) -> COTARead:  # noqa: F821
    return cotas.remove_sentences(
        db=db,
        cota_id=cota_id,
        cota_sentence_ids=cota_sentence_ids,
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


@router.get(
    "/refine/most_recent/{cota_id}",
    response_model=Optional[COTARefinementJobRead],
    summary="Returns the most recent COTA Refinement Job for the given COTA ID",
    description="Returns the most recent COTA Refinement Job for the given COTA ID",
)
async def get_most_recent_cota_job(
    *,
    cota_id: int,
) -> Optional[COTARefinementJobRead]:
    return redis.get_most_recent_cota_job_by_cota_id(cota_id=cota_id)


@router.post(
    "/reset/{cota_id}",
    response_model=COTARead,
    summary="Resets the ConceptOverTimeAnalysis",
    description="Resets the ConceptOverTimeAnalysis deleting model, embeddings, refinement jobs and resetting the search space",
)
async def reset_cota(
    *,
    db: Session = Depends(get_db_session),
    cota_id: int,
) -> COTARead:
    return cotas.reset(
        db=db,
        cota_id=cota_id,
    )
