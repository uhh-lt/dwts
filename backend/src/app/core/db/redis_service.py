import uuid
from datetime import datetime
from typing import List, Optional, Union

import redis
from loguru import logger

from app.core.data.dto.concept_over_time_analysis import (
    COTAConcept,
    COTARead,
    COTARefinementJobCreate,
    COTARefinementJobRead,
    COTARefinementJobUpdate,
    COTASentence,
)
from app.core.data.dto.crawler_job import (
    CrawlerJobCreate,
    CrawlerJobRead,
    CrawlerJobUpdate,
)
from app.core.data.dto.export_job import ExportJobCreate, ExportJobRead, ExportJobUpdate
from app.core.data.dto.feedback import FeedbackCreate, FeedbackRead
from app.core.data.dto.trainer_job import (
    TrainerJobCreate,
    TrainerJobRead,
    TrainerJobUpdate,
)
from app.util.singleton_meta import SingletonMeta
from config import conf


class RedisService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            # setup redis
            r_host = conf.redis.host
            r_port = conf.redis.port
            r_pass = conf.redis.password

            # setup clients
            clients = {}
            for client, db_idx in conf.redis.clients.items():
                clients[client.lower()] = redis.Redis(
                    host=r_host, port=r_port, db=db_idx, password=r_pass
                )
                assert clients[client].ping(), (
                    f"Couldn't connect to Redis {str(client)} "
                    f"DB #{db_idx} at {r_host}:{r_port}!"
                )
                logger.info(
                    f"Successfully connected to Redis {str(client)} DB #{db_idx}"
                )
            cls.__clients = clients
        except Exception as e:
            msg = f"Cannot connect to Redis DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        if kwargs["flush_all_clients"] if "flush_all_clients" in kwargs else False:
            logger.warning("Flushing all DWTS Redis Clients!")
            for typ, client in clients.items():
                client.flushdb()
                client.save()

        return super(RedisService, cls).__new__(cls)

    def shutdown(self) -> None:
        logger.info("Shutting down Redis Service!")
        for client in self.__clients.values():
            client.close()

    @staticmethod
    def _generate_random_key() -> str:
        return str(uuid.uuid4())

    def _get_client(self, typ: str):
        if typ.lower() not in self.__clients:
            raise KeyError(f"Redis Client '{typ.lower()}' does not exist!")
        return self.__clients[typ.lower()]

    def _flush_all_clients(self):
        for typ in self.__clients.keys():
            self._flush_client(typ=typ)

    def _flush_client(self, typ: str):
        client = self._get_client(typ)
        logger.warning(f"Flushing Redis Client DB '{typ}'!")
        client.flushdb()
        client.save()

    def store_export_job(
        self, export_job: Union[ExportJobCreate, ExportJobRead]
    ) -> ExportJobRead:
        client = self._get_client("export")

        if isinstance(export_job, ExportJobCreate):
            key = self._generate_random_key()
            exj = ExportJobRead(
                id=key, created=datetime.now(), **export_job.model_dump()
            )
        elif isinstance(export_job, ExportJobRead):
            key = export_job.id
            exj = export_job

        if client.set(key.encode("utf-8"), exj.model_dump_json()) != 1:
            msg = "Cannot store ExportJob!"
            logger.error(msg)
            raise RuntimeError(msg)

        logger.debug(f"Successfully stored ExportJob {key}!")

        return exj

    def load_export_job(self, key: str) -> ExportJobRead:
        client = self._get_client("export")
        exj = client.get(key.encode("utf-8"))
        if exj is None:
            msg = f"ExportJob with ID {key} does not exist!"
            logger.error(msg)
            raise KeyError(msg)

        logger.debug(f"Successfully loaded ExportJob {key}")
        return ExportJobRead.model_validate_json(exj)

    def update_export_job(self, key: str, update: ExportJobUpdate) -> ExportJobRead:
        exj = self.load_export_job(key=key)
        data = exj.model_dump()
        data.update(**update.model_dump())
        exj = ExportJobRead(**data)
        exj = self.store_export_job(export_job=exj)
        logger.debug(f"Updated ExportJob {key}")
        return exj

    def delete_export_job(self, key: str) -> ExportJobRead:
        exj = self.load_export_job(key=key)
        client = self._get_client("export")
        if client.delete(key.encode("utf-8")) != 1:
            msg = f"Cannot delete ExportJob {key}"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Deleted ExportJob {key}")
        return exj

    def store_crawler_job(
        self, crawler_job: Union[CrawlerJobCreate, CrawlerJobRead]
    ) -> CrawlerJobRead:
        client = self._get_client("crawler")

        if isinstance(crawler_job, CrawlerJobCreate):
            key = self._generate_random_key()
            cj = CrawlerJobRead(
                id=key, created=datetime.now(), **crawler_job.model_dump()
            )
        elif isinstance(crawler_job, CrawlerJobRead):
            key = crawler_job.id
            cj = crawler_job

        if client.set(key.encode("utf-8"), cj.model_dump_json()) != 1:
            msg = "Cannot store CrawlerJob!"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Successfully stored CrawlerJob {key}!")
        return cj

    def load_crawler_job(self, key: str) -> CrawlerJobRead:
        client = self._get_client("crawler")

        cj = client.get(key.encode("utf-8"))
        if cj is None:
            msg = f"CrawlerJob with ID {key} does not exist!"
            logger.error(msg)
            raise KeyError(msg)
        logger.debug(f"Successfully loaded CrawlerJob {key}")
        return CrawlerJobRead.model_validate_json(cj)

    def update_crawler_job(self, key: str, update: CrawlerJobUpdate) -> CrawlerJobRead:
        cj = self.load_crawler_job(key=key)
        data = cj.model_dump()
        data.update(**update.model_dump())
        cj = CrawlerJobRead(**data)
        cj = self.store_crawler_job(crawler_job=cj)
        logger.debug(f"Updated CrawlerJob {key}")
        return cj

    def delete_crawler_job(self, key: str) -> CrawlerJobRead:
        cj = self.load_crawler_job(key=key)
        client = self._get_client("crawler")
        if client.delete(key.encode("utf-8")) != 1:
            msg = f"Cannot delete CrawlerJob {key}"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Deleted CrawlerJob {key}")
        return cj

    def get_all_crawler_jobs(
        self, project_id: Optional[int] = None
    ) -> List[CrawlerJobRead]:
        client = self._get_client("crawler")
        all_crawler_jobs: List[CrawlerJobRead] = [
            self.load_crawler_job(str(key, "utf-8")) for key in client.keys()
        ]
        if project_id is None:
            return all_crawler_jobs
        else:
            return [
                job
                for job in all_crawler_jobs
                if job.parameters.project_id == project_id
            ]

    def store_trainer_job(
        self, trainer_job: Union[TrainerJobCreate, TrainerJobRead]
    ) -> TrainerJobRead:
        client = self._get_client("trainer")

        if isinstance(trainer_job, TrainerJobCreate):
            key = self._generate_random_key()
            tj = TrainerJobRead(
                id=key,
                created=datetime.now(),
                updated=datetime.now(),
                **trainer_job.model_dump(),
            )
        elif isinstance(trainer_job, TrainerJobRead):
            key = trainer_job.id
            tj = trainer_job

        if client.set(key.encode("utf-8"), tj.model_dump_json()) != 1:
            msg = "Cannot store TrainerJob!"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Successfully stored TrainerJob {key}!")
        return tj

    def load_trainer_job(self, key: str) -> TrainerJobRead:
        client = self._get_client("trainer")

        tj = client.get(key.encode("utf-8"))
        if tj is None:
            msg = f"TrainerJob with ID {key} does not exist!"
            logger.error(msg)
            raise KeyError(msg)
        logger.debug(f"Successfully loaded TrainerJob {key}")
        return TrainerJobRead.model_validate_json(tj)

    def update_trainer_job(self, key: str, update: TrainerJobUpdate) -> TrainerJobRead:
        tj = self.load_trainer_job(key=key)
        data = tj.model_dump()
        data.update(**update.model_dump())
        tj = TrainerJobRead(**data, updated=datetime.now())
        tj = self.store_trainer_job(trainer_job=tj)
        logger.debug(f"Updated TrainerJob {key}")
        return tj

    def delete_trainer_job(self, key: str) -> TrainerJobRead:
        tj = self.load_trainer_job(key=key)
        client = self._get_client("trainer")
        if client.delete(key.encode("utf-8")) != 1:
            msg = f"Cannot delete TrainerJob {key}"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Deleted TrainerJob {key}")
        return tj

    def get_all_trainer_jobs(
        self, project_id: Optional[int] = None
    ) -> List[TrainerJobRead]:
        client = self._get_client("trainer")
        all_trainer_jobs: List[TrainerJobRead] = [
            self.load_trainer_job(str(key, "utf-8")) for key in client.keys()
        ]
        if project_id is None:
            return all_trainer_jobs
        else:
            return [
                job
                for job in all_trainer_jobs
                if job.parameters.project_id == project_id
            ]

    def store_cota_job(
        self, cota_job: Union[COTARefinementJobCreate, COTARefinementJobRead]
    ) -> COTARefinementJobRead:
        client = self._get_client("cota")

        if isinstance(cota_job, COTARefinementJobRead):
            key = cota_job.id
            tj = cota_job
        elif isinstance(cota_job, COTARefinementJobCreate):
            key = self._generate_random_key()
            tj = COTARefinementJobRead(
                id=key,
                created=datetime.now(),
                updated=datetime.now(),
                **cota_job.model_dump(),
            )

        if client.set(key.encode("utf-8"), tj.model_dump_json()) != 1:
            msg = "Cannot store COTARefinementJob!"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Successfully stored COTARefinementJob {key}!")
        return tj

    def load_cota_job(self, key: str) -> COTARefinementJobRead:
        client = self._get_client("cota")

        tj = client.get(key.encode("utf-8"))
        if tj is None:
            msg = f"COTARefinementJob with ID {key} does not exist!"
            logger.error(msg)
            raise KeyError(msg)
        logger.debug(f"Successfully loaded COTARefinementJob {key}")
        return COTARefinementJobRead.model_validate_json(tj)

    def update_cota_job(
        self, key: str, update: COTARefinementJobUpdate
    ) -> COTARefinementJobRead:
        tj = self.load_cota_job(key=key)
        data = tj.model_dump(exclude={"updated"})
        if len(data) >= 0:
            data.update(**update.model_dump())
            cota = data.pop("cota")
            concepts = cota.pop("concepts")
            search_space = cota.pop("search_space")
            data["cota"] = COTARead(
                **cota,
                concepts=[COTAConcept(**concept) for concept in concepts],
                search_space=[COTASentence(**sentence) for sentence in search_space],
            )
            data["updated"] = datetime.now()
            tj = COTARefinementJobRead(**data)
            tj = self.store_cota_job(cota_job=tj)
            logger.debug(f"Updated COTARefinementJob {key}")
        return tj

    def delete_cota_job(self, key: str) -> COTARefinementJobRead:
        tj = self.load_cota_job(key=key)
        client = self._get_client("cota")
        if client.delete(key.encode("utf-8")) != 1:
            msg = f"Cannot delete COTARefinementJob {key}"
            logger.error(msg)
            raise RuntimeError(msg)
        logger.debug(f"Deleted COTARefinementJob {key}")
        return tj

    def delete_all_cota_job_by_cota_id(
        self, cota_id: int
    ) -> List[COTARefinementJobRead]:
        all_cota_jobs_by_cota_id = self.get_all_cota_jobs_by_cota_id(cota_id=cota_id)
        for cota_job in all_cota_jobs_by_cota_id:
            self.delete_cota_job(cota_job.id)
        return all_cota_jobs_by_cota_id

    def get_all_cota_jobs(
        self, project_id: Optional[int] = None
    ) -> List[COTARefinementJobRead]:
        client = self._get_client("cota")
        all_cota_jobs: List[COTARefinementJobRead] = [
            self.load_cota_job(str(key, "utf-8")) for key in client.keys()
        ]
        if project_id is None:
            return all_cota_jobs
        else:
            return [job for job in all_cota_jobs if job.cota.project_id == project_id]

    def get_all_cota_jobs_by_cota_id(self, cota_id: int) -> List[COTARefinementJobRead]:
        client = self._get_client("cota")
        all_cota_jobs: List[COTARefinementJobRead] = [
            self.load_cota_job(str(key, "utf-8")) for key in client.keys()
        ]
        all_cota_jobs_by_cota_id = [
            job for job in all_cota_jobs if job.cota.id == cota_id
        ]
        return all_cota_jobs_by_cota_id

    def get_most_recent_cota_job_by_cota_id(
        self, cota_id: int
    ) -> Optional[COTARefinementJobRead]:
        all_cota_jobs_by_cota_id = self.get_all_cota_jobs_by_cota_id(cota_id=cota_id)
        if len(all_cota_jobs_by_cota_id) == 0:
            return None
        else:
            return sorted(all_cota_jobs_by_cota_id, key=lambda x: x.updated)[-1]

    def store_feedback(self, feedback: FeedbackCreate) -> FeedbackRead:
        client = self._get_client("feedback")
        key = self._generate_random_key()
        fb = FeedbackRead(
            id=key,
            user_content=feedback.user_content,
            user_id=feedback.user_id,
            created=datetime.now(),
        )
        if client.set(key.encode("utf-8"), fb.model_dump_json()) != 1:
            msg = "Cannot store Feedback!"
            logger.error(msg)
            raise RuntimeError(msg)

        logger.debug("Successfully stored Feedback!")

        return fb

    def load_feedback(self, key: str) -> FeedbackRead:
        client = self._get_client("feedback")
        fb = client.get(key.encode("utf-8"))
        if fb is None:
            msg = f"Feedback with ID {key} does not exist!"
            logger.error(msg)
            raise KeyError(msg)

        logger.debug(f"Successfully loaded Feedback {key}")
        return FeedbackRead.model_validate_json(fb)

    def get_all_feedbacks(self) -> List[FeedbackRead]:
        client = self._get_client("feedback")
        return [self.load_feedback(str(key, "utf-8")) for key in client.keys()]

    def get_all_feedbacks_of_user(self, user_id: int) -> List[FeedbackRead]:
        fbs = self.get_all_feedbacks()
        return [fb for fb in fbs if fb.user_id == user_id]
