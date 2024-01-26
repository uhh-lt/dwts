from typing import List

import torch
from loguru import logger
from setfit import SetFitModel
from sklearn.linear_model import LogisticRegression

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.data.dto.concept_over_time_analysis import (
    COTASentence,
)
from app.core.data.repo.repo_service import RepoService
from app.core.search.simsearch_service import SimSearchService

repo: RepoService = RepoService()
sims: SimSearchService = SimSearchService()


def apply_st(cargo: Cargo) -> Cargo:
    # read the required data
    search_space: List[COTASentence] = cargo.data["search_space"]

    # if no model exists, use the embeddings stored in weaviate
    model_name = f"{cargo.job.cota.id}-best-model"
    if not repo.model_exists(
        proj_id=cargo.job.cota.project_id,
        model_name=model_name,
    ):
        search_space_embeddings = sims.get_sentence_embeddings(
            search_tuples=[
                (cota_sent.sentence_id, cota_sent.sdoc_id) for cota_sent in search_space
            ]
        )
        embeddings_tensor = torch.tensor(search_space_embeddings)
        probabilities = [[0.5, 0.5] for _ in search_space]
        logger.debug("No model exists. We use weaviate embeddings.")
    else:
        sentences: List[str] = [ss.text for ss in search_space]

        # 1. Load the st model
        proj_id = cargo.job.cota.project_id
        model_path = repo.get_model_dir(proj_id=proj_id, model_name=model_name)
        model = SetFitModel.from_pretrained(model_path)
        logger.debug(f"Loaded {model_name} from {model_path}! Ready to embedd :)")

        # 2. Embedd the search space sentences
        sentence_transformer = model.model_body
        if sentence_transformer is None:
            raise ValueError(
                f"Model {model_name} does not have a sentence_transformer!"
            )
        sentence_transformer.eval()
        embeddings = sentence_transformer.encode(
            sentences=sentences,
            show_progress_bar=True,
            convert_to_numpy=False,
            normalize_embeddings=True,
        )
        embeddings_tensor = torch.stack(embeddings)

        # 3. Predict the probabilities for each concept
        regrssion_model: LogisticRegression = model.model_head
        probabilities = regrssion_model.predict_proba(embeddings_tensor.cpu().numpy())

    # 4. Update cargo with the refined search space reduced embeddings
    cargo.data["search_space_embeddings"] = embeddings_tensor
    cargo.data["concept_probabilities"] = probabilities

    return cargo
