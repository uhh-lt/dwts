from typing import Any, Dict, List, Tuple

import numpy as np
import torch
import umap
from loguru import logger
from torch.utils.data import DataLoader

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.analysis.cota.pipeline.concept_embedding_model import (
    ConceptEmbeddingModel,
)
from app.core.analysis.cota.pipeline.concept_embeddings_dataset import (
    ConceptEmbeddingsDataset,
)
from app.core.data.dto.concept_over_time_analysis import COTASentence
from app.core.data.repo.repo_service import RepoService
from app.core.search.simsearch_service import SimSearchService
from app.trainer.trainer_service import TrainerService

repo: RepoService = RepoService()
trainer: TrainerService = TrainerService()
sims: SimSearchService = SimSearchService()

MIN_CONCEPT_SENTENCE_ANNOTATIONS = 5


def _get_annotation_sentence_indices(cargo: Cargo) -> Dict[str, List[int]]:
    """Returns the indices of the sentences in the search space that are annotated with a concept, for each concept"""

    annotations: Dict[str, List[int]] = {
        concept.id: [] for concept in cargo.job.cota.concepts
    }
    for idx, sentence in enumerate(cargo.data["search_space"]):
        if sentence.concept_annotation is not None:
            annotations[sentence.concept_annotation].append(idx)
    return annotations


def __get_concept_sentence_annotations(cargo: Cargo) -> Dict[str, List[COTASentence]]:
    """Returns the sentences in the search space that are annotated with a concept, for each concept"""
    annotations: Dict[str, List[COTASentence]] = {
        concept.id: [] for concept in cargo.job.cota.concepts
    }
    for sentence in cargo.data["search_space"]:
        if sentence.concept_annotation is not None:
            annotations[sentence.concept_annotation].append(sentence)
    return annotations


def _has_min_concept_sentence_annotations(cargo: Cargo) -> bool:
    """Returns true if each concept has at least min_required_annotations_per_concept"""

    annotations = __get_concept_sentence_annotations(cargo)

    for concept_id, concept_annotations in annotations.items():
        if (
            len(concept_annotations)
            < cargo.job.cota.training_settings.min_required_annotations_per_concept
        ):
            return False

    return True


def _store_embeddings(
    cargo: Cargo, embeddings: torch.Tensor | np.ndarray | Any
) -> None:
    if isinstance(embeddings, np.ndarray):
        embeddings = torch.from_numpy(embeddings)
    elif not isinstance(embeddings, torch.Tensor):
        raise ValueError(
            f"Embeddings must be of type torch.Tensor or np.ndarray, but was {type(embeddings)}"
        )
    proj_id = cargo.job.cota.project_id
    embedding_name = str(cargo.job.cota.id)
    embeddings_path = repo.get_embeddings_filename(
        proj_id=proj_id, embedding_name=embedding_name
    )
    torch.save(embeddings, embeddings_path)
    logger.debug(f"Stored embeddings of shape {embeddings.shape} at {embeddings_path}!")


def _load_embeddings(cargo: Cargo) -> torch.Tensor:
    proj_id = cargo.job.cota.project_id
    embedding_name = str(cargo.job.cota.id)
    embeddings_path = repo.get_embeddings_filename(
        proj_id=proj_id, embedding_name=embedding_name
    )
    if not embeddings_path.exists():
        raise ValueError(
            f"Embeddings {embedding_name} in Project {proj_id} does not exist!"
        )
    embeddings = torch.load(embeddings_path)
    logger.debug(
        f"Loaded embeddings of shape {embeddings.shape} from {embeddings_path}!"
    )
    return embeddings


def _store_model(cargo: Cargo, model: ConceptEmbeddingModel) -> None:
    proj_id = cargo.job.cota.project_id
    model_name = str(cargo.job.cota.id)
    model_path = repo.get_model_dir(proj_id=proj_id, model_name=model_name)
    model.save(path=model_path)


def _load_model(
    cargo: Cargo, eval: bool = False, device: str = "cpu"
) -> ConceptEmbeddingModel:
    proj_id = cargo.job.cota.project_id
    model_name = str(cargo.job.cota.id)
    model_path = repo.get_model_dir(proj_id=proj_id, model_name=model_name)
    if not model_path.exists():
        raise ValueError(f"Model {model_name} in Project {proj_id} does not exist!")
    model = ConceptEmbeddingModel.load(path=model_path)
    if eval:
        model.eval()
    model.to(device)
    logger.debug(f"Loaded {model} from {model_path} to {device}!")

    return model


def __store_dataloader(cargo: Cargo, dataloader: DataLoader) -> None:
    dataloader_path = repo.get_dataloader_filename(
        proj_id=cargo.job.cota.project_id, dataloader_name=str(cargo.job.cota.id)
    )
    torch.save(dataloader, dataloader_path)


def __collate_fn(batch: List[Tuple[torch.Tensor, int]]) -> Dict[str, torch.Tensor]:
    embeddings, labels = zip(*batch)
    return {
        "embeddings": torch.stack(embeddings),
        "labels": torch.tensor(labels),
    }


def _create_training_dataloader(
    cargo: Cargo,
    batch_size: int = 8,
    shuffle: bool = True,
    pin_memory: bool = True,
    num_workers: int = 1,
    store: bool = False,
) -> DataLoader:
    embeddings = _load_embeddings(cargo=cargo)
    dataset = ConceptEmbeddingsDataset(cargo, embeddings)

    dataloader = DataLoader(
        dataset,
        batch_size=batch_size,
        pin_memory=pin_memory,
        shuffle=shuffle,
        num_workers=num_workers,
        collate_fn=__collate_fn,
    )

    if store:
        __store_dataloader(cargo=cargo, dataloader=dataloader)

    return dataloader


def _apply_umap(
    embs: torch.Tensor | np.ndarray,
    n_components: int,
    return_list: bool = True,
) -> np.ndarray | List[List[float]]:
    if isinstance(embs, torch.Tensor):
        embs = embs.numpy()
    reducer = umap.UMAP(n_components=n_components)
    reduced_embs = reducer.fit_transform(embs)

    if return_list:
        return reduced_embs.tolist()

    return reduced_embs
