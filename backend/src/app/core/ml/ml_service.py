from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.ml_job import MLJobRead, MLJobType, MLJobUpdate
from app.core.data.orm.source_document_job import SourceDocumentJobORM
from app.core.db.redis_service import RedisService
from app.core.ml.quote_service import QuoteService
from app.util.singleton_meta import SingletonMeta


class MLJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, ml_job_id: str) -> None:
        super().__init__(f"The MLJob with ID {ml_job_id} already started or is done!")


class NoSuchMLJobError(Exception):
    def __init__(self, ml_job_id: str, cause: Exception) -> None:
        super().__init__(f"There exists not MLJob with ID {ml_job_id}! {cause}")


class MLService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.redis: RedisService = RedisService()
        return super(MLService, cls).__new__(cls)

    def start_ml_job_sync(self, ml_job_id: str) -> MLJobRead:
        mlj = self.get_ml_job_from_queue(ml_job_id)
        if mlj.status != BackgroundJobStatus.WAITING:
            raise MLJobAlreadyStartedOrDoneError(ml_job_id)
        mlj = self._update_ml_job(
            ml_job_id, MLJobUpdate(status=BackgroundJobStatus.RUNNING)
        )

        filter_column = None
        match mlj.parameters.ml_job_type:
            case MLJobType.QUOTATION_ATTRIBUTION:
                filter_column = SourceDocumentJobORM.quotation_attribution_at
                QuoteService().perform_quotation_detection(
                    mlj.parameters.project_id, filter_column
                )

        mlj = self._update_ml_job(
            ml_job_id, MLJobUpdate(status=BackgroundJobStatus.FINISHED)
        )
        return mlj

    def get_ml_job_from_queue(self, ml_job_id: str) -> MLJobRead:
        try:
            mlj = self.redis.load_ml_job(key=ml_job_id)
        except Exception as e:
            raise NoSuchMLJobError(ml_job_id, cause=e)
        return mlj

    def _update_ml_job(self, ml_job_id: str, update: MLJobUpdate) -> MLJobRead:
        try:
            llmj = self.redis.update_ml_job(key=ml_job_id, update=update)
        except Exception as e:
            raise NoSuchMLJobError(ml_job_id, cause=e)
        return llmj
