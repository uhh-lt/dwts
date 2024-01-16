import os
from typing import List

import online_triplet_loss.losses as otl
import torch
import torch.nn as nn
from datasets import load_dataset
from loguru import logger
from sentence_transformers import InputExample, SentenceTransformer
from sentence_transformers.losses import CosineSimilarityLoss
from sqlalchemy.orm import Session
from torch.utils.data import DataLoader

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
            trainer_job = self.__finetune_cota(trainer_job)
            # trainer_job = self.__finetune_sbert_model(trainer_job)
            trainer_job.status = BackgroundJobStatus.FINISHED
            trainer_job = self.redis.store_trainer_job(trainer_job)
        except Exception as e:
            logger.error(f"Error while executing trainer job: {e}")
            trainer_job.status = BackgroundJobStatus.ERROR
            trainer_job = self.redis.store_trainer_job(trainer_job)
            raise e

        return trainer_job

    def _use_trainer_model_sync(self, trainer_job_id: str) -> List[float]:
        trainer_job = self.redis.load_trainer_job(trainer_job_id)
        logger.info(f"Using trained model: {trainer_job.saved_model_path}")

        model = SentenceTransformer(trainer_job.saved_model_path)

        toy_emb = model.encode(["Hello World!"])[0].tolist()

        del model
        torch.cuda.empty_cache()

        return toy_emb

    def __prepare_sbert_training_data(self) -> DataLoader:
        logger.info("Loading dataset...")
        dataset = load_dataset("SetFit/stsb")

        logger.info("Preparing training data...")
        train_examples = []
        train_data = dataset["train"]

        for i in range(len(train_data)):
            s = train_data[i]
            train_examples.append(
                InputExample(texts=[s["text1"], s["text2"]], label=s["label"])
            )

        train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=32)

        return train_dataloader

    def __finetune_sbert_model(self, trainer_job: TrainerJobRead) -> TrainerJobRead:
        params = trainer_job.parameters

        base_model_name = params.base_model_name
        model_name = params.new_model_name

        logger.info(f"Fine-tuning SBert model {base_model_name}...")

        logger.info("Loading model...")
        model = SentenceTransformer(
            base_model_name,
            cache_folder=os.environ["TRANSFORMERS_CACHE"],
            device="cuda",
        )

        train_loss = CosineSimilarityLoss(model=model)
        train_dataloader = self.__prepare_sbert_training_data()

        num_epochs = 1
        warmup_steps = int(len(train_dataloader) * num_epochs * 0.1)

        logger.info("Starting training...")
        out_p = (
            self.repo.get_model_path(proj_id=params.project_id, model_name=model_name)
            / "output"
        )

        model.fit(
            train_objectives=[(train_dataloader, train_loss)],
            epochs=num_epochs,
            warmup_steps=warmup_steps,
            checkpoint_path=str(
                self.repo.get_model_path(
                    proj_id=params.project_id, model_name=model_name
                )
                / "checkpoints"
            ),
            output_path=str(out_p),
        )

        logger.info("Saving model...")
        model.save(path=str(out_p), model_name=model_name)

        trainer_job.saved_model_path = str(out_p)

        del model, train_loss, train_dataloader
        torch.cuda.empty_cache()

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
        import torch.optim as optim
        from online_triplet_loss.losses import batch_hard_triplet_loss

        trainloader_path = self.repo.get_dataloader_path(
            proj_id=trainer_job.parameters.project_id,
            dataloader_name=trainer_job.parameters.train_dataloader_name,
        )
        dataloader = torch.load(trainloader_path)
        print(f"{len(dataloader)=}")
        model_path = self.repo.get_model_path(
            proj_id=trainer_job.parameters.project_id,
            model_name=trainer_job.parameters.train_model_name,
        )
        model = torch.load(model_path)
        criterion = batch_hard_triplet_loss
        optimizer = optim.AdamW(model.parameters(), lr=0.001)
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
