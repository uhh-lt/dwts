from typing import List

from app.trainer.trainer_service import TrainerService
from loguru import logger

ts: TrainerService = TrainerService()


def start_trainer_job_(trainer_job_id: str) -> None:
    ts_result = ts._start_trainer_job_sync(trainer_job_id=trainer_job_id)

    logger.info(f"TrainerJob {trainer_job_id} has finished! Result: {ts_result}")


def use_trainer_model_task_(trainer_job_id: str) -> List[float]:
    return ts._use_trainer_model_sync(trainer_job_id=trainer_job_id)
