from typing import List, Optional

import srsly
from fastapi.encoders import jsonable_encoder
from loguru import logger
from sqlalchemy.orm import Session

from app.celery.background_jobs import start_cota_refinement_job_async
from app.core.analysis.cota.pipeline import build_cota_refinement_pipeline
from app.core.data.crud.concept_over_time_analysis import crud_cota
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.concept_over_time_analysis import (
    COTACreate,
    COTACreateAsInDB,
    COTARead,
    COTARefinementHyperparameters,
    COTARefinementJobCreate,
    COTARefinementJobRead,
    COTASentence,
    COTAUpdate,
    COTAUpdateAsInDB,
)
from app.core.db.redis_service import RedisService
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.simsearch_service import SimSearchService
from app.trainer.trainer_service import TrainerService
from app.util.singleton_meta import SingletonMeta


class COTAService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.trainer: TrainerService = TrainerService()
        cls.sims: SimSearchService = SimSearchService()
        cls.es: ElasticSearchService = ElasticSearchService()
        cls.redis: RedisService = RedisService()

        cls.max_search_space_per_concept: int = 1000
        cls.search_space_sim_search_threshold: float = 0.5

        return super(COTAService, cls).__new__(cls)

    def __resolve_sentences_text(self, cota: COTARead) -> COTARead:
        raise NotImplementedError()
        sdoc2sentences = dict()
        for sent in cota.search_space:
            if sent.sdoc_id not in sdoc2sentences:
                sdoc2sentences[sent.sdoc_id] = []
            sdoc2sentences[sent.sdoc_id].append(sent.sentence_id)

        sentid2text = dict()
        for sdoc_id, sentences in sdoc2sentences.items():
            sdoc_sentences = self.es.get_sdoc_sentences_by_sdoc_id(
                proj_id=cota.project_id, sdoc_id=sdoc_id
            )
            if sdoc_sentences is not None:
                for sent_id in sentences:
                    sentid2text[sent_id] = sdoc_sentences.sentences[sent_id]

        sentence_search_space = [
            COTASentence(
                **sent.model_dump(exclude={"text"}), text=sentid2text[sent.sentence_id]
            )
            for sent in cota.search_space
        ]
        cota.search_space = sentence_search_space
        return cota

    def create(self, db: Session, cota_create: COTACreate) -> COTARead:
        # convert the provided concepts to json string
        concepts_str = srsly.json_dumps(jsonable_encoder(cota_create.concepts))
        create_dto_as_in_db = COTACreateAsInDB(
            **cota_create.model_dump(exclude={"concepts"}, exclude_none=True),
            concepts=concepts_str,
        )

        db_obj = crud_cota.create(db=db, create_dto=create_dto_as_in_db)
        return COTARead.model_validate(db_obj)

    def read_by_id(self, *, db: Session, cota_id: int) -> COTARead:
        db_obj = crud_cota.read(db=db, id=cota_id)
        return COTARead.model_validate(db_obj)

    def read_by_project_and_user(
        self,
        *,
        db: Session,
        project_id: int,
        user_id: int,
    ) -> List[COTARead]:
        db_objs = crud_cota.read_by_project_and_user(
            db=db, project_id=project_id, user_id=user_id, raise_error=False
        )
        return [COTARead.model_validate(db_obj) for db_obj in db_objs]

    def update(
        self,
        *,
        db: Session,
        cota_id: int,
        cota_update: COTAUpdate,
    ) -> COTARead:
        # make sure that cota with cota_id exists
        self.read_by_id(db=db, cota_id=cota_id)

        update_dto_as_in_db = COTAUpdateAsInDB(
            **cota_update.model_dump(
                exclude={"concepts", "search_space", "search_space_coordinates"},
                exclude_none=True,
            ),
        )

        if cota_update.concepts is not None:
            concepts_str = srsly.json_dumps(jsonable_encoder(cota_update.concepts))
            update_dto_as_in_db.concepts = concepts_str

        if cota_update.search_space is not None:
            search_space_str = srsly.json_dumps(
                jsonable_encoder(cota_update.search_space)
            )
            update_dto_as_in_db.search_space = search_space_str

        # update the cota in db
        db_obj = crud_cota.update(db=db, id=cota_id, update_dto=update_dto_as_in_db)

        # return the results
        return COTARead.model_validate(db_obj)

    def delete_by_id(self, *, db: Session, cota_id: int) -> COTARead:
        db_obj = crud_cota.remove(db=db, id=cota_id)
        return COTARead.model_validate(db_obj)

    def create_and_start_refinement_job_async(
        self,
        *,
        db: Session,
        cota_id: int,
        hyperparams: Optional[COTARefinementHyperparameters],
    ) -> COTARefinementJobRead:
        # make sure the cota exists!
        cota = self.read_by_id(db=db, cota_id=cota_id)

        # make sure there is at least one concept
        if len(cota.concepts) == 0:
            raise ValueError("Concepts missing")

        if hyperparams is None:
            hyperparams = COTARefinementHyperparameters()
        create_dto = COTARefinementJobCreate(cota=cota, hyperparams=hyperparams)

        job = self.redis.store_cota_job(create_dto)
        logger.info(f"Created and prepared COTA Refinement job: {job}")

        start_cota_refinement_job_async(cota_job_id=job.id)  # FIXME

        return job

    def _start_refinement_job_sync(
        self,
        *,
        job_id: str,
    ) -> COTARefinementJobRead:
        # THIS IS EXECUTED IN THE BACKGROUND JOBS WORKER
        pipeline = build_cota_refinement_pipeline()

        job: COTARefinementJobRead = self.redis.load_cota_job(job_id)
        logger.info(f"Starting COTA Refinement job: {job} " f"for COTA {job.cota.id}")

        job.status = BackgroundJobStatus.RUNNING
        job = self.redis.store_cota_job(job)
        try:
            job = pipeline.execute(job)
        except Exception as e:
            logger.error(f"Error while executing COTA Refinement job: {job}")
            job.status = BackgroundJobStatus.ERROR
            job = self.redis.store_cota_job(job)
            raise e

        return job
