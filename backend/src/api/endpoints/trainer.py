from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db_session
from app.core.data.dto.trainer_job import TrainerJobParameters, TrainerJobRead
from app.core.db.redis_service import RedisService
from app.trainer.trainer_service import TrainerService

router = APIRouter(prefix="/trainer")
tags = ["trainer"]

redis: RedisService = RedisService()
ts: TrainerService = TrainerService()


@router.post(
    "/",
    tags=tags,
    response_model=TrainerJobRead,
    summary="Starts a TrainerJob",
    description="Starts a TrainerJob with the given parameters",
)
async def start_trainer_job(
    *,
    db: Session = Depends(get_db_session),
    parameters: TrainerJobParameters,
) -> Optional[TrainerJobRead]:
    return ts.create_and_start_trainer_job_async(db=db, trainer_params=parameters)


@router.get(
    "/{trainer_job_id}",
    tags=tags,
    response_model=Optional[TrainerJobRead],
    summary="Returns the TrainerJob for the given ID",
    description="Returns the TrainerJob for the given ID if it exists",
)
async def get_trainer_job(
    *,
    trainer_job_id: str,
) -> Optional[TrainerJobRead]:
    return redis.load_trainer_job(trainer_job_id)


@router.get(
    "/project/{project_id}",
    tags=tags,
    response_model=List[TrainerJobRead],
    summary="Returns all TrainerJobs for the given project ID",
    description="Returns all TrainerJobs for the given project ID if it exists",
)
async def get_all_trainer_jobs(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
) -> List[TrainerJobRead]:
    return redis.get_all_trainer_jobs(project_id=project_id)
