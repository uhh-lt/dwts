from pathlib import Path
from typing import Dict, Literal, Tuple

import torch
import torch.nn as nn
import torch.optim as optim
from loguru import logger
from online_triplet_loss.losses import batch_all_triplet_loss, batch_hard_triplet_loss


class ConceptEmbeddingModel(nn.Module):
    def __init__(
        self,
        num_layers: int = 5,
        input_dim: int = 64,
        hidden_dim: int = 64,
        output_dim: int = 64,
        loss_fn: Literal[
            "batch_hard_triplet_loss", "batch_all_triplet_loss"
        ] = "batch_hard_triplet_loss",
        triplet_loss_margin: int = 100,
    ):
        super().__init__()
        self.num_layers = num_layers
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        if loss_fn == "batch_hard_triplet_loss":
            self.loss_fn = batch_hard_triplet_loss
        elif loss_fn == "batch_all_triplet_loss":
            self.loss_fn = batch_all_triplet_loss
        else:
            raise NotImplementedError(f"Loss function {loss_fn} not implemented!")
        self.triplet_loss_margin = triplet_loss_margin

        layers = []
        for i in range(num_layers):
            if i == 0:
                layers.append(torch.nn.Linear(input_dim, hidden_dim))
            elif i == num_layers - 1:
                layers.append(torch.nn.Linear(hidden_dim, output_dim))
            else:
                layers.append(torch.nn.Linear(hidden_dim, hidden_dim))
            layers.append(torch.nn.ReLU())

        self.model = torch.nn.Sequential(*layers)

    def build_optimizer(
        self,
        opti: str = "adamw",
        lr: float = 1e-3,
        weight_decay: float = 1e-2,
        betas: Tuple[float, float] = (0.9, 0.999),
        eps: float = 1e-8,
        momentum: float = 0.9,
    ) -> torch.optim.Optimizer:
        if opti == "adamw":
            optimizer = optim.AdamW(
                self.parameters(),
                lr=lr,
                weight_decay=weight_decay,
                betas=betas,
                eps=eps,
            )
        if opti == "sgd":
            optimizer = optim.SGD(
                self.parameters(),
                lr=lr,
                momentum=momentum,
            )
        else:
            raise NotImplementedError(f"Optimizer {opti} not implemented!")
        return optimizer

    def forward(
        self,
        embeddings: torch.Tensor,
        labels: torch.Tensor | None = None,
    ) -> Dict[str, torch.Tensor] | torch.Tensor:
        embeddings = self.model(embeddings)  # B x D
        if labels is None:
            return embeddings
        loss = self.loss_fn(
            labels=labels,
            embeddings=embeddings,
            margin=self.triplet_loss_margin,
            squared=False,
        )  # scalar float tensor
        if isinstance(loss, Tuple):
            loss = loss[0]

        loss.backward()

        return {"embeddings": embeddings, "loss": loss}

    def __repr__(self) -> str:
        return f"ConceptEmbeddingModel({self.num_layers=}, {self.input_dim=}, {self.hidden_dim=}, {self.output_dim=})"

    def save(self, path: str | Path) -> None:
        path = Path(path)
        if path.suffix != ".pt":
            path = path.with_suffix(".pt")
        torch.save(self, path)
        logger.debug(f"Stored {self} at {path}!")

    @classmethod
    def load(cls, path: str | Path) -> "ConceptEmbeddingModel":
        return torch.load(path)
