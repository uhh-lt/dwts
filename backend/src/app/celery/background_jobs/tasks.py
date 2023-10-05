from pathlib import Path
from typing import List, Tuple

from app.celery.background_jobs.crawl import start_crawler_job_
from app.celery.background_jobs.export import start_export_job_
from app.celery.background_jobs.preprocess import (
    execute_audio_preprocessing_pipeline_,
    execute_image_preprocessing_pipeline_,
    execute_text_preprocessing_pipeline_,
    execute_video_preprocessing_pipeline_,
    import_uploaded_archive_,
)
from app.celery.celery_worker import celery_worker
from app.core.data.dto.crawler_job import CrawlerJobRead
from app.core.data.dto.export_job import ExportJobRead
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


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
def execute_text_preprocessing_pipeline_task(cargos: List[PipelineCargo]) -> None:
    execute_text_preprocessing_pipeline_(cargos=cargos)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def execute_image_preprocessing_pipeline_task(cargos: List[PipelineCargo]) -> None:
    execute_image_preprocessing_pipeline_(cargos=cargos)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def execute_audio_preprocessing_pipeline_task(cargos: List[PipelineCargo]) -> None:
    execute_audio_preprocessing_pipeline_(cargos=cargos)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def execute_video_preprocessing_pipeline_task(cargos: List[PipelineCargo]) -> None:
    execute_video_preprocessing_pipeline_(cargos=cargos)


@celery_worker.task(
    acks_late=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 5, "countdown": 5},
)
def import_uploaded_archive(archive_file_path_and_project_id: Tuple[Path, int]) -> None:
    # we need a tuple to chain the task since chaining only allows for one return object
    archive_file_path, project_id = archive_file_path_and_project_id
    import_uploaded_archive_(archive_file_path=archive_file_path, project_id=project_id)
