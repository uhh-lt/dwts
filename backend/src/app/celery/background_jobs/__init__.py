from pathlib import Path
from typing import Any, List

from app.core.data.crawler.crawler_service import CrawlerService
from app.core.data.dto.crawler_job import CrawlerJobParameters, CrawlerJobRead
from app.core.data.dto.export_job import ExportJobParameters, ExportJobRead
from app.core.data.export.export_service import ExportService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from celery.canvas import Signature
from celery.result import AsyncResult

import_uploaded_archive_task = (
    "app.celery.background_jobs.tasks.import_uploaded_archive"
)
start_export_job_task = "app.celery.background_jobs.tasks.start_export_job"
start_crawler_job_task = "app.celery.background_jobs.tasks.start_crawler_job"

execute_text_preprocessing_pipeline_task = (
    "app.celery.background_jobs.tasks.execute_text_preprocessing_pipeline_task"
)
execute_image_preprocessing_pipeline_task = (
    "app.celery.background_jobs.tasks.execute_image_preprocessing_pipeline_task"
)
execute_audio_preprocessing_pipeline_task = (
    "app.celery.background_jobs.tasks.execute_audio_preprocessing_pipeline_task"
)
execute_video_preprocessing_pipeline_task = (
    "app.celery.background_jobs.tasks.execute_video_preprocessing_pipeline_task"
)
start_trainer_job_task = "app.celery.background_jobs.tasks.start_trainer_job_task"
use_trainer_model_task = "app.celery.background_jobs.tasks.use_trainer_model_task"


def start_trainer_job_async(
    trainer_job_id: str,
) -> None:
    start_trainer_job = Signature(
        start_trainer_job_task, kwargs={"trainer_job_id": trainer_job_id}
    )
    start_trainer_job.apply_async()


def use_trainer_model_async(
    trainer_job_id: str,
) -> AsyncResult:
    use_trainer_model = Signature(
        use_trainer_model_task, kwargs={"trainer_job_id": trainer_job_id}
    )
    return use_trainer_model.apply_async()


def import_uploaded_archive_apply_async(
    archive_file_path: Path, project_id: int
) -> Any:
    archive_preprocessing = Signature(
        import_uploaded_archive_task,
        kwargs={"archive_file_path_and_project_id": (archive_file_path, project_id)},
    )
    return archive_preprocessing.apply_async()


def prepare_and_start_export_job_async(
    export_params: ExportJobParameters,
) -> ExportJobRead:
    exs: ExportService = ExportService()
    ex_job = exs.prepare_export_job(export_params)
    start_export_job = Signature(start_export_job_task, kwargs={"export_job": ex_job})
    start_export_job.apply_async()

    return ex_job


def prepare_and_start_crawling_job_async(
    crawler_params: CrawlerJobParameters,
) -> CrawlerJobRead:
    cs: CrawlerService = CrawlerService()
    cj = cs.prepare_crawler_job(crawler_params)
    start_export_job = (
        # crawl the data via scrapy and zip the data
        Signature(start_crawler_job_task, kwargs={"crawler_job": cj})
        |
        # import the zip
        # TODO create a PPJ for the import
        Signature(import_uploaded_archive_task)
    )
    start_export_job.apply_async()

    return cj


def execute_text_preprocessing_pipeline_apply_async(
    cargos: List[PipelineCargo],
) -> None:
    Signature(
        execute_text_preprocessing_pipeline_task, kwargs={"cargos": cargos}
    ).apply_async()


def execute_image_preprocessing_pipeline_apply_async(
    cargos: List[PipelineCargo],
) -> None:
    Signature(
        execute_image_preprocessing_pipeline_task, kwargs={"cargos": cargos}
    ).apply_async()


def execute_audio_preprocessing_pipeline_apply_async(
    cargos: List[PipelineCargo],
) -> None:
    Signature(
        execute_audio_preprocessing_pipeline_task, kwargs={"cargos": cargos}
    ).apply_async()


def execute_video_preprocessing_pipeline_apply_async(
    cargos: List[PipelineCargo],
) -> None:
    Signature(
        execute_video_preprocessing_pipeline_task, kwargs={"cargos": cargos}
    ).apply_async()
