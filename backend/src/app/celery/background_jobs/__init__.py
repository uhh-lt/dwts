from pathlib import Path
from typing import Any, List

from celery import Task, group
from celery.result import GroupResult

from app.core.data.classification.document_classification_service import (
    DocumentClassificationService as DocumentClassificationService,
)
from app.core.data.crawler.crawler_service import CrawlerService
from app.core.data.dto.crawler_job import CrawlerJobParameters, CrawlerJobRead
from app.core.data.dto.document_tag_recommendation import (
    DocumentTagRecommendationJobRead as DocumentTagRecommendationJobRead,
)
from app.core.data.dto.export_job import ExportJobParameters, ExportJobRead
from app.core.data.dto.import_job import ImportJobParameters, ImportJobRead
from app.core.data.dto.llm_job import LLMJobParameters2, LLMJobRead
from app.core.data.export.export_service import ExportService
from app.core.data.import_.import_service import ImportService
from app.core.data.llm.llm_service import LLMService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo


def start_cota_refinement_job_async(
    cota_job_id: str,
) -> None:
    from app.celery.background_jobs.tasks import start_cota_refinement_job_task

    assert isinstance(start_cota_refinement_job_task, Task), "Not a Celery Task"

    start_cota_refinement_job_task.apply_async(kwargs={"cota_job_id": cota_job_id})


def start_trainer_job_async(
    trainer_job_id: str,
) -> None:
    from app.celery.background_jobs.tasks import start_trainer_job_task

    assert isinstance(start_trainer_job_task, Task), "Not a Celery Task"

    start_trainer_job_task.apply_async(kwargs={"trainer_job_id": trainer_job_id})


def import_uploaded_archive_apply_async(
    archive_file_path: Path, project_id: int
) -> Any:
    from app.celery.background_jobs.tasks import import_uploaded_archive

    assert isinstance(import_uploaded_archive, Task), "Not a Celery Task"

    return import_uploaded_archive.apply_async(
        kwargs={"archive_file_path_and_project_id": (archive_file_path, project_id)},
    )


def prepare_and_start_export_job_async(
    export_params: ExportJobParameters,
) -> ExportJobRead:
    from app.celery.background_jobs.tasks import start_export_job

    assert isinstance(start_export_job, Task), "Not a Celery Task"

    exs: ExportService = ExportService()
    ex_job = exs.prepare_export_job(export_params)
    print("-----ex id", ex_job.id)
    start_export_job.apply_async(kwargs={"export_job": ex_job})
    return ex_job


def prepare_and_start_import_job_async(
    import_job_params: ImportJobParameters,
) -> ImportJobRead:
    from app.celery.background_jobs.tasks import start_import_job

    assert isinstance(start_import_job, Task), "Not a Celery Task"
    ims: ImportService = ImportService()
    ims_job = ims.prepare_import_job(import_job_params)
    start_import_job.apply_async(kwargs={"import_job": ims_job})
    return ims_job


def prepare_and_start_crawling_job_async(
    crawler_params: CrawlerJobParameters,
) -> CrawlerJobRead:
    from app.celery.background_jobs.tasks import (
        import_uploaded_archive,
        start_crawler_job,
    )

    assert isinstance(start_crawler_job, Task), "Not a Celery Task"
    assert isinstance(import_uploaded_archive, Task), "Not a Celery Task"

    cs: CrawlerService = CrawlerService()
    cj = cs.prepare_crawler_job(crawler_params)

    job1 = start_crawler_job.signature(kwargs={"crawler_job": cj})
    job2 = import_uploaded_archive.signature()

    assert job1 is not None, "Job 1 is None"
    assert job2 is not None, "Job 2 is None"

    start_export_job_chain = job1 | job2
    start_export_job_chain.apply_async()

    return cj


def prepare_and_start_llm_job_async(
    llm_job_params: LLMJobParameters2,
) -> LLMJobRead:
    from app.celery.background_jobs.tasks import start_llm_job

    assert isinstance(start_llm_job, Task), "Not a Celery Task"

    llms: LLMService = LLMService()
    llm_job = llms.prepare_llm_job(llm_job_params)
    start_llm_job.apply_async(kwargs={"llm_job": llm_job})
    return llm_job


def execute_text_preprocessing_pipeline_apply_async(
    cargos: List[PipelineCargo],
) -> GroupResult:
    from app.celery.background_jobs.tasks import (
        execute_text_preprocessing_pipeline_task,
    )

    assert isinstance(
        execute_text_preprocessing_pipeline_task, Task
    ), "Not a Celery Task"

    tasks = []
    for cargo in cargos:
        tasks.append(execute_text_preprocessing_pipeline_task.s(cargo=cargo))
    return group(tasks).apply_async()


def execute_image_preprocessing_pipeline_apply_async(
    cargos: List[PipelineCargo],
) -> None:
    from app.celery.background_jobs.tasks import (
        execute_image_preprocessing_pipeline_task,
    )

    assert isinstance(
        execute_image_preprocessing_pipeline_task, Task
    ), "Not a Celery Task"

    for cargo in cargos:
        execute_image_preprocessing_pipeline_task.apply_async(kwargs={"cargo": cargo})


def execute_audio_preprocessing_pipeline_apply_async(
    cargos: List[PipelineCargo],
) -> None:
    from app.celery.background_jobs.tasks import (
        execute_audio_preprocessing_pipeline_task,
    )

    assert isinstance(
        execute_audio_preprocessing_pipeline_task, Task
    ), "Not a Celery Task"

    for cargo in cargos:
        execute_audio_preprocessing_pipeline_task.apply_async(kwargs={"cargo": cargo})


def execute_video_preprocessing_pipeline_apply_async(
    cargos: List[PipelineCargo],
) -> None:
    from app.celery.background_jobs.tasks import (
        execute_video_preprocessing_pipeline_task,
    )

    assert isinstance(
        execute_video_preprocessing_pipeline_task, Task
    ), "Not a Celery Task"

    for cargo in cargos:
        execute_video_preprocessing_pipeline_task.apply_async(kwargs={"cargo": cargo})


def prepare_and_start_document_classification_job_async(
    task_id: int, project_id: int
) -> None:
    from app.celery.background_jobs.tasks import (
        start_document_classification_job,
    )

    assert isinstance(start_document_classification_job, Task), "Not a Celery Task"
    start_document_classification_job(task_id=task_id, project_id=project_id)
