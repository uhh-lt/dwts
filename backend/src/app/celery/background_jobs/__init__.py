from pathlib import Path
from typing import Any, List

from app.core.data.crawler.crawler_service import CrawlerService
from app.core.data.dto.crawler_job import CrawlerJobParameters, CrawlerJobRead
from app.core.data.dto.export_job import ExportJobParameters, ExportJobRead
from app.core.data.export.export_service import ExportService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


def start_trainer_job_async(
    trainer_job_id: str,
) -> None:
    from app.celery.background_jobs.tasks import start_trainer_job_task
    
    start_trainer_job_task.apply_async(kwargs={"trainer_job_id": trainer_job_id})


def use_trainer_model_async(
    trainer_job_id: str,
) -> Any:
    from app.celery.background_jobs.tasks import use_trainer_model_task

    return use_trainer_model_task.apply_async(kwargs={"trainer_job_id": trainer_job_id})


def import_uploaded_archive_apply_async(
    archive_file_path: Path, project_id: int
) -> Any:
    from app.celery.background_jobs.tasks import import_uploaded_archive

    return import_uploaded_archive.apply_async(
        kwargs={"archive_file_path_and_project_id": (archive_file_path, project_id)},
    )


def prepare_and_start_export_job_async(
    export_params: ExportJobParameters,
) -> ExportJobRead:
    from app.celery.background_jobs.tasks import start_export_job

    exs: ExportService = ExportService()
    ex_job = exs.prepare_export_job(export_params)
    start_export_job.apply_async(kwargs={"export_job": ex_job})
    return ex_job


def prepare_and_start_crawling_job_async(
    crawler_params: CrawlerJobParameters,
) -> CrawlerJobRead:
    from app.celery.background_jobs.tasks import (
        import_uploaded_archive,
        start_crawler_job,
    )

    cs: CrawlerService = CrawlerService()
    cj = cs.prepare_crawler_job(crawler_params)
    start_export_job_chain = (
        # crawl the data via scrapy and zip the data
        start_crawler_job.signature(kwargs={"crawler_job": cj})
        |
        # import the zip
        # TODO create a PPJ for the import
        import_uploaded_archive.signature()
    )
    start_export_job_chain.apply_async()

    return cj


def execute_text_preprocessing_pipeline_apply_async(
    cargos: List[PipelineCargo],
) -> None:
    from app.celery.background_jobs.tasks import (
        execute_text_preprocessing_pipeline_task,
    )

    for cargo in cargos:
        execute_text_preprocessing_pipeline_task.apply_async(kwargs={"cargo": cargo})


def execute_image_preprocessing_pipeline_apply_async(
    cargos: List[PipelineCargo],
) -> None:
    from app.celery.background_jobs.tasks import (
        execute_image_preprocessing_pipeline_task,
    )

    for cargo in cargos:
        execute_image_preprocessing_pipeline_task.apply_async(kwargs={"cargo": cargo})


def execute_audio_preprocessing_pipeline_apply_async(
    cargos: List[PipelineCargo],
) -> None:
    from app.celery.background_jobs.tasks import (
        execute_audio_preprocessing_pipeline_task,
    )

    for cargo in cargos:
        execute_audio_preprocessing_pipeline_task.apply_async(kwargs={"cargo": cargo})


def execute_video_preprocessing_pipeline_apply_async(
    cargos: List[PipelineCargo],
) -> None:
    from app.celery.background_jobs.tasks import (
        execute_video_preprocessing_pipeline_task,
    )

    for cargo in cargos:
        execute_video_preprocessing_pipeline_task.apply_async(kwargs={"cargo": cargo})
