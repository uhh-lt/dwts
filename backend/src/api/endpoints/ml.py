from typing import List

from fastapi import APIRouter, Depends

from api.dependencies import get_current_user
from app.celery.background_jobs import prepare_and_start_ml_job_async
from app.core.authorization.authz_user import AuthzUser
from app.core.data.dto.ml_job import MLJobParameters, MLJobRead
from app.core.ml.ml_service import MLService

router = APIRouter(prefix="/ml", dependencies=[Depends(get_current_user)], tags=["ml"])

mls: MLService = MLService()


@router.post(
    "",
    response_model=MLJobRead,
    summary="Returns the MLJob for the given Parameters",
)
def start_ml_job(
    *, ml_job_params: MLJobParameters, authz_user: AuthzUser = Depends()
) -> MLJobRead:
    authz_user.assert_in_project(ml_job_params.project_id)

    return prepare_and_start_ml_job_async(ml_job_params=ml_job_params)


@router.get(
    "/{ml_job_id}",
    response_model=MLJobRead,
    summary="Returns the MLJob for the given ID if it exists",
)
def get_ml_job(*, ml_job_id: str, authz_user: AuthzUser = Depends()) -> MLJobRead:
    job = mls.get_ml_job(ml_job_id=ml_job_id)
    mls.get_ml_job
    authz_user.assert_in_project(job.parameters.project_id)

    return job


@router.get(
    "/project/{project_id}",
    response_model=List[MLJobRead],
    summary="Returns all MLJobRead for the given project ID if it exists",
)
def get_all_lm_jobs(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> List[MLJobRead]:
    authz_user.assert_in_project(project_id)

    ml_jobs = mls.get_all_ml_jobs(project_id=project_id)
    ml_jobs.sort(key=lambda x: x.created, reverse=True)
    return ml_jobs
