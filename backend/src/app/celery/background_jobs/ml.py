from loguru import logger

from app.core.data.dto.ml_job import MLJobRead
from app.core.ml.ml_service import MLService

mls: MLService = MLService()


def start_llm_job_(ml_job: MLJobRead) -> None:
    logger.info((f"Starting MLJob {ml_job.id}"))
    mls.start_ml_job_sync(ml_job_id=ml_job.id)

    logger.info(f"MLJob {ml_job.id} has finished!")
