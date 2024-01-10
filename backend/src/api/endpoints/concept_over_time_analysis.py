from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from app.core.analysis.cota.service import COTAService
from app.core.data.dto.concept_over_time_analysis import (
    COTACreate,
    COTARead,
    COTAUpdate,
)

cotas: COTAService = COTAService()

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
