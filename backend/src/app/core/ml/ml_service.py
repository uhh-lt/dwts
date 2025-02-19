from datetime import datetime
from typing import List, Union

from sqlalchemy import or_

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.ml_job import (
    MLJobCreate,
    MLJobParameters,
    MLJobRead,
    MLJobType,
    MLJobUpdate,
)
from app.core.data.orm.source_document_job import SourceDocumentJobORM
from app.core.db.redis_service import RedisService
from app.core.ml.quote_service import QuoteService
from app.util.singleton_meta import SingletonMeta


class MLJobPreparationError(Exception):
    def __init__(self, cause: Union[Exception, str]) -> None:
        super().__init__(f"Cannot prepare and create the MLJob! {cause}")


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

    def prepare_ml_job(self, ml_params: MLJobParameters) -> MLJobRead:
        # if not self._assert_all_requested_data_exists(ml_params=ml_params):
        #     raise MLJobPreparationError(
        #         cause="Not all requested data for the ML job exists!"
        #     )

        mlj_create = MLJobCreate(
            parameters=ml_params,
        )
        try:
            mlj_read = self.redis.store_ml_job(ml_job=mlj_create)
        except Exception as e:
            raise MLJobPreparationError(cause=e)

        return mlj_read

    def get_all_ml_jobs(self, project_id: int) -> List[MLJobRead]:
        return self.redis.get_all_ml_jobs(project_id=project_id)

    def start_ml_job_sync(self, ml_job_id: str) -> MLJobRead:
        start_time = datetime.now()
        mlj = self.get_ml_job(ml_job_id)
        if mlj.status == BackgroundJobStatus.RUNNING:
            raise MLJobAlreadyStartedOrDoneError(ml_job_id)
        mlj = self._update_ml_job(
            ml_job_id, MLJobUpdate(status=BackgroundJobStatus.RUNNING)
        )

        try:
            filter_column = None
            match mlj.parameters.ml_job_type:
                case MLJobType.QUOTATION_ATTRIBUTION:
                    recompute = mlj.parameters.specific_llm_job_parameters.recompute
                    filter_column = SourceDocumentJobORM.quotation_attribution_at
                    filter_criterion = (
                        or_(filter_column < start_time, filter_column == None)
                        if recompute
                        else filter_column == None
                    )
                    QuoteService().perform_quotation_detection(
                        mlj.parameters.project_id, filter_criterion, recompute
                    )
            mlj = self._update_ml_job(
                ml_job_id, MLJobUpdate(status=BackgroundJobStatus.FINISHED)
            )
        except Exception as e:
            mlj = self._update_ml_job(
                ml_job_id, MLJobUpdate(status=BackgroundJobStatus.ERROR, error=repr(e))
            )

        return mlj

    def get_ml_job(self, ml_job_id: str) -> MLJobRead:
        try:
            mlj = self.redis.load_ml_job(key=ml_job_id)
        except Exception as e:
            raise NoSuchMLJobError(ml_job_id, cause=e)
        return mlj

    def _update_ml_job(self, ml_job_id: str, update: MLJobUpdate) -> MLJobRead:
        try:
            mlj = self.redis.update_ml_job(key=ml_job_id, update=update)
        except Exception as e:
            raise NoSuchMLJobError(ml_job_id, cause=e)
        return mlj
