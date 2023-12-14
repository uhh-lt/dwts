from typing import List

from fastapi import APIRouter, Depends

from api.dependencies import get_current_user
from app.celery.background_jobs import prepare_and_start_crawling_job_async
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crawler.crawler_service import CrawlerService
from app.core.data.dto.crawler_job import CrawlerJobParameters, CrawlerJobRead

router = APIRouter(
    prefix="/crawler", dependencies=[Depends(get_current_user)], tags=["crawler"]
)

cs: CrawlerService = CrawlerService()


@router.post(
    "",
    response_model=CrawlerJobRead,
    summary="Returns the CrawlerJob for the given Parameters",
    description="Returns the CrawlerJob for the given Parameters",
)
async def start_crawler_job(
    *, crawler_params: CrawlerJobParameters, authz_user: AuthzUser = Depends()
) -> CrawlerJobRead:
    authz_user.assert_in_project(crawler_params.project_id)

    return prepare_and_start_crawling_job_async(crawler_params=crawler_params)


@router.get(
    "/{crawler_job_id}",
    response_model=CrawlerJobRead,
    summary="Returns the CrawlerJob for the given ID",
    description="Returns the CrawlerJob for the given ID if it exists",
)
async def get_crawler_job(
    *, crawler_job_id: str, authz_user: AuthzUser = Depends()
) -> CrawlerJobRead:
    job = cs.get_crawler_job(crawler_job_id=crawler_job_id)

    authz_user.assert_in_project(job.parameters.project_id)

    return job


@router.get(
    "/project/{project_id}",
    response_model=List[CrawlerJobRead],
    summary="Returns all CrawlerJobs for the given project ID",
    description="Returns all CrawlerJobs for the given project ID if it exists",
)
async def get_all_crawler_jobs(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> List[CrawlerJobRead]:
    authz_user.assert_in_project(project_id)

    crawler_jobs = cs.get_all_crawler_jobs(project_id=project_id)
    crawler_jobs.sort(key=lambda x: x.created, reverse=True)
    return crawler_jobs
