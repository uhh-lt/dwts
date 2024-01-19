from typing import Dict, List, Tuple

import torch
from torch.utils.data import Dataset

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.data.dto.concept_over_time_analysis import COTASentence


class ConceptEmbeddingsDataset(Dataset):
    def __init__(self, cargo: Cargo, embeddings: torch.Tensor):
        search_space: List[COTASentence] = cargo.data["search_space"]
        conceptid2label: Dict[str, int] = {
            concept.id: idx for idx, concept in enumerate(cargo.job.cota.concepts)
        }

        training_data: List[Tuple[torch.Tensor, int]] = []
        for idx, sentence in enumerate(search_space):
            if sentence.concept_annotation:
                training_data.append(
                    (embeddings[idx], conceptid2label[sentence.concept_annotation])
                )

        self.training_data = training_data

    def __len__(self) -> int:
        return len(self.training_data)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        return self.training_data[idx]
