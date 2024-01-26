from typing import List

import online_triplet_loss.losses as otl
import torch
import torch.nn as nn
from loguru import logger
from sqlalchemy.orm import Session

from app.celery.background_jobs import start_trainer_job_async, use_trainer_model_async
from app.core.data.crud.project import crud_project
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.trainer_job import (
    TrainerJobCreate,
    TrainerJobParameters,
    TrainerJobRead,
)
from app.core.data.repo.repo_service import RepoService
from app.core.db.redis_service import RedisService
from app.util.singleton_meta import SingletonMeta


class TrainerService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.redis: RedisService = RedisService()
        cls.repo: RepoService = RepoService()

        return super(TrainerService, cls).__new__(cls)

    def create_and_start_trainer_job_async(
        self, *, db: Session, trainer_params: TrainerJobParameters
    ) -> TrainerJobRead:
        # make sure the project exists!
        crud_project.read(db=db, id=trainer_params.project_id)

        create_dto = TrainerJobCreate(parameters=trainer_params)
        trainer_job_read = self.redis.store_trainer_job(create_dto)
        logger.info(f"Created and prepared trainer job: {trainer_job_read}")

        start_trainer_job_async(trainer_job_id=trainer_job_read.id)

        return trainer_job_read

    def use_trainer_model(self, *, db: Session, trainer_job_id: str) -> List[float]:
        # make sure the trainer job exists!
        trainer_job = self.redis.load_trainer_job(trainer_job_id)
        # make sure the project exists!
        crud_project.read(db=db, id=trainer_job.parameters.project_id)

        return use_trainer_model_async(trainer_job_id=trainer_job_id).get()

    def _start_trainer_job_sync(self, trainer_job_id: str) -> TrainerJobRead:
        trainer_job = self.redis.load_trainer_job(trainer_job_id)
        logger.info(
            f"Starting trainer job: {trainer_job} "
            f"with parameters: {trainer_job.parameters}"
        )
        trainer_job.status = BackgroundJobStatus.RUNNING
        trainer_job = self.redis.store_trainer_job(trainer_job)

        try:
            # TODO: decide from the trainer job what model to train...
            # trainer_job = self.__finetune_sbert_model(trainer_job)
            trainer_job.status = BackgroundJobStatus.FINISHED
            trainer_job = self.redis.store_trainer_job(trainer_job)
        except Exception as e:
            logger.error(f"Error while executing trainer job: {e}")
            trainer_job.status = BackgroundJobStatus.ERROR
            trainer_job = self.redis.store_trainer_job(trainer_job)
            raise e

        return trainer_job

    #########################################################
    #      Concept Over Time Anaylsis related functions     #
    #########################################################

    def _create_probing_layers_network(
        self,
        num_layers: int = 5,
        input_dim: int = 64,
        hidden_dim: int = 64,
        output_dim: int = 64,
    ) -> nn.Sequential:
        layers = []
        for i in range(num_layers):
            if i == 0:
                layers.append(torch.nn.Linear(input_dim, hidden_dim))
            elif i == num_layers - 1:
                layers.append(torch.nn.Linear(hidden_dim, output_dim))
            else:
                layers.append(torch.nn.Linear(hidden_dim, hidden_dim))
            layers.append(torch.nn.ReLU())
        return torch.nn.Sequential(*layers)

    def __do_a_triplet_loss(self) -> None:
        otl.F
        # this is just to import otl and not get it removed by ruff

    def __finetune_cota(self, trainer_job: TrainerJobRead) -> TrainerJobRead:
        trainloader_path = self.repo.get_dataloader_filename(
            proj_id=trainer_job.parameters.project_id,
            dataloader_name=trainer_job.parameters.train_dataloader_name,
        )
        dataloader = torch.load(trainloader_path)
        print(f"{len(dataloader)=}")
        model_path = self.repo.get_model_dir(
            proj_id=trainer_job.parameters.project_id,
            model_name=trainer_job.parameters.train_model_name,
        )
        model = torch.load(model_path)
        criterion = otl.batch_hard_triplet_loss
        optimizer = torch.optim.AdamW(model.parameters(), lr=0.001)
        for epoch in range(
            trainer_job.parameters.epochs
        ):  # loop over the dataset multiple times
            running_loss = 0.0
            for i, data in enumerate(dataloader, 0):
                print(f"{i=}")
                # get the inputs; data is a list of [inputs, labels]
                inputs, labels = data

                # zero the parameter gradients
                optimizer.zero_grad()

                # forward + backward + optimize
                outputs = model(inputs)
                loss = criterion(labels, outputs, margin=100)
                loss.backward()
                optimizer.step()

                # print statistics
                running_loss += loss.item()
                if i % 20 == 19:  # print every 2000 mini-batches
                    print(f"[{epoch + 1}, {i + 1:5d}] loss: {running_loss / 20:.3f}")
                    running_loss = 0.0

        torch.save(model, model_path)
        return trainer_job
