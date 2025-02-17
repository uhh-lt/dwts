import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, TypedDict

import torch
from dto.seqsenttagger import (
    SeqSentTaggerDoc,
    SeqSentTaggerJobInput,
    SeqSentTaggerJobResponse,
)
from pytorch_lightning import LightningModule, Trainer, loggers
from pytorch_lightning.callbacks import ModelCheckpoint
from pytorch_lightning.callbacks.early_stopping import EarlyStopping
from ray import serve
from ray_config import build_ray_model_deployment_config, conf
from torch import nn
from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence, pad_sequence
from torch.utils.data import DataLoader, Dataset
from torchcrf import CRF


class ValidationOutput(TypedDict):
    loss: List[float]
    predictions: List[List[int]]
    tags: List[List[int]]


class SentenceTagger(LightningModule):
    def __init__(
        self,
        num_tags,
        id2tag: Dict[int, str],
        embedding_dim=512,
        hidden_dim=256,
        use_lstm=True,
        learning_rate=1e-3,
    ):
        super().__init__()
        self.save_hyperparameters()  # Save hyperparameters for easy loading

        # Init model architecure
        self.embedding_dim = embedding_dim

        if use_lstm:
            self.lstm = nn.LSTM(
                self.embedding_dim, hidden_dim, batch_first=True, bidirectional=True
            )
            linear_input_dim = 2 * hidden_dim  # Double the hidden_dim for bidirectional
        else:
            linear_input_dim = self.embedding_dim
            self.lstm = None

        self.linear = nn.Linear(linear_input_dim, num_tags)
        self.crf = CRF(num_tags, batch_first=True)

        # Other params
        self.learning_rate = learning_rate
        self.validation_outputs: ValidationOutput = {
            "loss": [],
            "predictions": [],
            "tags": [],
        }
        self.test_outputs: ValidationOutput = {
            "loss": [],
            "predictions": [],
            "tags": [],
        }
        self.id2tag = id2tag

    def forward(self, x, tags=None, mask=None):
        assert mask is not None, "Mask must be provided"

        if self.lstm:
            lengths = mask.sum(dim=1).tolist()  # Calculate lengths of valid sequences
            packed_embeddings = pack_padded_sequence(
                x, lengths, batch_first=True, enforce_sorted=False
            )
            packed_output, _ = self.lstm(
                packed_embeddings
            )  # Pass packed sequence to LSTM
            x, _ = pad_packed_sequence(
                packed_output, batch_first=True
            )  # Unpack the output

        emissions = self.linear(x)

        if tags is None:
            return self.crf.decode(emissions, mask=mask)
        else:
            return -self.crf(emissions, tags, mask=mask)  # Negative log-likelihood loss

    def training_step(self, batch, batch_idx):
        sentences, tags, mask = batch
        loss = self(sentences, tags=tags, mask=mask)
        self.log("train_loss", loss)
        return loss

    def validation_step(self, batch, batch_idx):
        sentences, tags, mask = batch
        loss = self(sentences, tags=tags, mask=mask)
        self.log("val_loss", loss)

        # Get predictions and ground truth tags
        preds = self(sentences, mask=mask)
        golds = []
        for i in range(len(tags)):  # Iterate over the batch
            golds.append(tags[i][mask[i] == 1].tolist())

        self.validation_outputs["loss"].append(loss.item())
        self.validation_outputs["predictions"].extend(preds)
        self.validation_outputs["tags"].extend(golds)
        return loss

    def test_step(self, batch, batch_idx):
        sentences, tags, mask = batch
        loss = self(sentences, tags=tags, mask=mask)
        self.log("test_loss", loss)

        # Get predictions and ground truth tags
        preds = self(sentences, mask=mask)
        golds = []
        for i in range(len(tags)):  # Iterate over the batch
            golds.append(tags[i][mask[i] == 1].tolist())

        self.test_outputs["loss"].append(loss.item())
        self.test_outputs["predictions"].extend(preds)
        self.test_outputs["tags"].extend(golds)
        return loss

    def configure_optimizers(self):
        return torch.optim.AdamW(self.parameters(), lr=self.learning_rate)


class SentenceTaggingDataset(Dataset):
    def __init__(self, data: List[SeqSentTaggerDoc]):
        self.embeddings = [d.sent_embeddings for d in data]
        labels = [d.sent_labels for d in data]

        # compute unique tags and create tag2id and id2tag mappings
        unique_tags: Set[str] = set()
        for ls in labels:
            unique_tags.update(ls)
        unique_tags.update("O")  # Add the "O" tag

        self.tags = unique_tags
        self.tag2id = {tag: i for i, tag in enumerate(sorted(list(unique_tags)))}
        self.id2tag = {i: tag for tag, i in self.tag2id.items()}

        # create the labels field that uses the ids, not the strings
        self.labels = [[self.tag2id[tag] for tag in ls] for ls in labels]

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        labels = self.labels[idx]
        embeddings = torch.tensor(self.embeddings[idx])
        return embeddings, labels


def collate_fn(batch):
    embeddings, labels = zip(*batch)

    # Pad labels
    labels = [torch.tensor(ll) for ll in labels]
    padded_labels = pad_sequence(labels, batch_first=True, padding_value=0)

    # Create mask
    mask = torch.zeros(padded_labels.shape, dtype=torch.bool)
    for i, label in enumerate(labels):
        mask[i, : len(label)] = 1

    # Pad embeddings
    padded_embeddings = pad_sequence(embeddings, batch_first=True, padding_value=0)

    # switch first sentence (0) with longest sentence (longest_idx)
    longest_idx = max(range(len(labels)), key=lambda k: len(labels[k]))

    padded_embeddings = padded_embeddings.tolist()
    padded_labels = padded_labels.tolist()
    mask = mask.tolist()

    new_padded_embeddings = padded_embeddings.copy()
    new_padded_labels = padded_labels.copy()
    new_mask = mask.copy()

    new_padded_embeddings[0] = padded_embeddings[longest_idx]
    new_padded_labels[0] = padded_labels[longest_idx]
    new_mask[0] = mask[longest_idx]

    new_padded_embeddings[longest_idx] = padded_embeddings[0]
    new_padded_labels[longest_idx] = padded_labels[0]
    new_mask[longest_idx] = mask[0]

    assert (
        len(padded_embeddings)
        == len(padded_labels)
        == len(mask)
        == len(new_padded_embeddings)
        == len(new_padded_labels)
        == len(new_mask)
    ), (
        f"Lengths must match: {len(padded_embeddings)}, {len(padded_labels)}, {len(mask)}, {len(new_padded_embeddings)}, {len(new_padded_labels)}, {len(new_mask)}"
    )

    return (
        torch.tensor(new_padded_embeddings),
        torch.tensor(new_padded_labels),
        torch.tensor(new_mask, dtype=torch.bool),
    )


cc = conf.seqsenttagger

DEVICE = cc.device
BATCH_SIZE = cc.batch_size

SHARED_REPO_ROOT: Path = Path(conf.repo_root)

logger = logging.getLogger("ray.serve")


@serve.deployment(**build_ray_model_deployment_config("seqsenttagger"))
class SeqSentTaggerModel:
    def train_apply(self, input: SeqSentTaggerJobInput) -> SeqSentTaggerJobResponse:
        # 1 finetune
        trained_model_ckpt_path = self.__train_model(input)

        # 2 apply model
        preds = self.__test_model(
            test_data=input.test_data, model_path=trained_model_ckpt_path
        )

        return SeqSentTaggerJobResponse(
            pred_data=[
                SeqSentTaggerDoc(sent_labels=pred, sent_embeddings=[]) for pred in preds
            ]
        )

    def __train_model(self, input: SeqSentTaggerJobInput) -> Path:
        # Split the training data into train and validation
        train_size = int(0.8 * len(input.training_data))
        train_data = input.training_data[:train_size]
        val_data = input.training_data[train_size:]

        # 1. Create the training & validation data
        train_dataset = SentenceTaggingDataset(train_data)
        train_dataloader = DataLoader(
            train_dataset, batch_size=BATCH_SIZE, shuffle=True, collate_fn=collate_fn
        )
        logger.info(
            f"Created training dataset with {len(train_dataset)} samples. Used tags: {train_dataset.tags}, Mapping: {train_dataset.tag2id}"
        )
        val_dataset = SentenceTaggingDataset(val_data)
        val_dataloader = DataLoader(
            val_dataset, batch_size=BATCH_SIZE, shuffle=False, collate_fn=collate_fn
        )
        logger.info(
            f"Created validation dataset with {len(val_dataset)} samples. Used tags: {val_dataset.tags}, Mapping: {val_dataset.tag2id}"
        )
        if train_dataset.tags != val_dataset.tags:
            raise Exception(
                f"Tags must be the same in train and validation dataset. Train: {train_dataset.tags}, Val: {val_dataset.tags}"
            )

        # Initialize the model
        embedding_dim = len(train_dataset.embeddings[0][0])
        model = SentenceTagger(
            num_tags=len(train_dataset.tags),
            use_lstm=True,
            id2tag=train_dataset.id2tag,
            embedding_dim=embedding_dim,
        )
        logger.info(
            f"Initialized model. Number of tags: {len(train_dataset.tags)}, Embedding dim: {embedding_dim}, ID2Tag: {train_dataset.id2tag}"
        )

        # Callbacks
        early_stopping = EarlyStopping(
            monitor="val_loss", patience=3
        )  # Stop if val_loss doesn't improve for 3 epochs

        model_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        model_path = self.__get_model_dir(
            proj_id=input.project_id, model_name=model_name
        )
        checkpoint = ModelCheckpoint(
            dirpath=model_path,
            filename="best-model",
            save_top_k=1,
            monitor="val_loss",
            mode="min",
        )

        # Logger
        tb_logger = loggers.TensorBoardLogger(
            save_dir=self.__get_temp_files_root_path()
        )

        # Trainer
        trainer = Trainer(
            logger=tb_logger,
            max_epochs=100,
            callbacks=[early_stopping, checkpoint],
            precision=32,  # full precision training
            gradient_clip_val=1.0,  # Gradient clipping
            accelerator=DEVICE,  # Use GPU
            devices=1,  # Use 1 GPU
        )

        # Train the model
        logger.info("Start model training!")
        trainer.fit(model, train_dataloader, val_dataloader)
        logger.info("Finished model training!")

        return model_path / "best-model.ckpt"

    def __test_model(
        self, test_data: List[SeqSentTaggerDoc], model_path: Path
    ) -> List[List[str]]:
        # 1. Create the test data
        test_dataset = SentenceTaggingDataset(test_data)
        test_dataloader = DataLoader(
            test_dataset, batch_size=BATCH_SIZE, shuffle=False, collate_fn=collate_fn
        )
        logger.info(f"Created test dataset with {len(test_dataset)} samples.")

        # 2. Load the best model
        model = SentenceTagger.load_from_checkpoint(
            checkpoint_path=str(model_path),
        )
        logger.info(f"Loaded trained model {str(model_path)}. Mapping: {model.id2tag}")

        # 3. Evaluate the model
        tb_logger = loggers.TensorBoardLogger(
            save_dir=self.__get_temp_files_root_path() / "lightning_logs"
        )
        trainer = Trainer(
            logger=tb_logger,
            accelerator=DEVICE,  # Use GPU
            devices=1,  # Use 1 GPU
        )
        logger.info("Start model test!")
        trainer.test(model, test_dataloader)
        logger.info("Finished model test!")

        preds = model.test_outputs["predictions"]
        logger.info(f"Predicted {len(preds)} documents!")
        logger.info(f"Showing the first prediction as ids: {preds[0]}")

        # 4. Convert the prediction ids to strings
        pred_tags: List[List[str]] = []
        for pred in preds:
            pred_tags.append([model.id2tag[i] for i in pred])
        logger.info(f"Showing the first prediction as strings: {pred_tags[0]}")

        return pred_tags

    def __get_temp_files_root_path(self) -> Path:
        return SHARED_REPO_ROOT.joinpath("temporary_files")

    def __get_project_repo_root_path(self, proj_id: int) -> Path:
        return SHARED_REPO_ROOT.joinpath(f"projects/{proj_id}/")

    def __get_models_root_path(self, proj_id: int) -> Path:
        return self.__get_project_repo_root_path(proj_id=proj_id).joinpath("models")

    def __get_model_dir(
        self,
        proj_id: int,
        model_name: str,
        model_prefix: str = "SeqSentTagger_",
    ) -> Path:
        name = (
            self.__get_models_root_path(proj_id=proj_id) / f"{model_prefix}{model_name}"
        )
        return name
