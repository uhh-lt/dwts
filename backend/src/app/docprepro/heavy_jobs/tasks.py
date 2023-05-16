from pathlib import Path
from typing import Tuple

from app.core.data.dto.export_job import ExportJobRead
from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.heavy_jobs.export import start_export_job_
from app.docprepro.heavy_jobs.preprocess import import_uploaded_archive_
from app.docprepro.heavy_jobs.crawl import start_crawler_job_
from app.core.data.dto.crawler_job import CrawlerJobRead


@celery_worker.task(acks_late=True)
def start_export_job(export_job: ExportJobRead) -> None:
    start_export_job_(export_job=export_job)


@celery_worker.task(acks_late=True)
def start_crawler_job(crawler_job: CrawlerJobRead) -> Tuple[Path, int]:
    archive_file_path, project_id = start_crawler_job_(crawler_job=crawler_job)
    return archive_file_path, project_id


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def import_uploaded_archive(archive_file_path_and_project_id: Tuple[Path, int]) -> None:
    # we need a tuple to chain the task since chaining only allows for one return object
    archive_file_path, project_id = archive_file_path_and_project_id
    import_uploaded_archive_(archive_file_path=archive_file_path, project_id=project_id)
