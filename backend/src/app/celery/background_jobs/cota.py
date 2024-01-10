from loguru import logger

from app.core.analysis.cota.service import COTAService

cs: COTAService = COTAService()


def start_cota_refinement_job_(cota_job_id: str) -> None:
    cs_result = cs._start_refinement_job_sync(job_id=cota_job_id)

    logger.info(f"COTARefinementJob {cota_job_id} has finished! Result: {cs_result}")
