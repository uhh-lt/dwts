import uuid
from datetime import datetime
from typing import List, Optional, Union

import redis
from app.core.data.dto.crawler_job import (
    CrawlerJobCreate,
    CrawlerJobRead,
    CrawlerJobUpdate,
)
from app.core.data.dto.export_job import ExportJobCreate, ExportJobRead, ExportJobUpdate
from app.core.data.dto.feedback import FeedbackCreate, FeedbackRead
from app.util.singleton_meta import SingletonMeta
from config import conf
from loguru import logger


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
            exj = ExportJobRead(id=key, created=datetime.now(), **export_job.dict())
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
        data = exj.dict()
        data.update(**update.dict())
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
        data = cj.dict()
        data.update(**update.dict())
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
