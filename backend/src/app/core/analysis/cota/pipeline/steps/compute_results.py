from typing import Dict, List

import torch

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.analysis.cota.pipeline.steps.util import (
    _apply_umap,
    _get_annotation_sentence_indices,
    _has_min_concept_sentence_annotations,
)
from app.core.data.dto.concept_over_time_analysis import (
    COTASentence,
)


def compute_results(cargo: Cargo) -> Cargo:
    # 1. get required data
    search_space: List[COTASentence] = cargo.data["search_space"]
    search_space_embeddings: torch.Tensor = cargo.data["search_space_embeddings"]
    probabilities = cargo.data["concept_probabilities"]

    # 2. rank search space sentences for each concept
    # this can only be done if a concept has sentence annotations, because we need those to compute the concept representation
    # if we do not have sentence annotations, the ranking / similarities were already computed by the initial simsearch (in the first step)
    if _has_min_concept_sentence_annotations(cargo):
        # 2.1 compute representation for each concept
        annotation_indices = _get_annotation_sentence_indices(cargo)
        concept_embeddings: Dict[
            str, torch.Tensor
        ] = dict()  # Dict[concept_id, concept_embedding]
        for concept in cargo.job.cota.concepts:
            # the concept representation is the average of all annotated concept sentences
            concept_embeddings[concept.id] = search_space_embeddings[
                annotation_indices[concept.id]
            ].mean(axis=0)  # TODO: normalize??

        # 2.2  compute similarity of average representation to each sentence
        concept_similarities: Dict[
            str, List[float]
        ] = dict()  # Dict[concept_id, List[similarity]]
        for concept_id, concept_embedding in concept_embeddings.items():
            sims = concept_embedding @ search_space_embeddings.T
            concept_similarities[concept_id] = sims.tolist()  # TODO normalize?

        # 2.3 update search_space with the concept similarities
        for concept_id, similarities in concept_similarities.items():
            for sentence, similarity in zip(search_space, similarities):
                sentence.concept_similarities[concept_id] = similarity

    # 3. Visualize results: Reduce the refined embeddings with UMAP to 2D
    # 3.1 reduce the dimensionality of the refined embeddings with UMAP

    visual_refined_embeddings = _apply_umap(
        embs=search_space_embeddings, n_components=2, return_list=True
    )

    # 3.2 update search_space with the 2D coordinates
    for sentence, coordinates in zip(search_space, visual_refined_embeddings):
        sentence.x = coordinates[0]
        sentence.y = coordinates[1]

    # 4. update search_space with concept_probabilities
    for sentence, probabilities in zip(search_space, probabilities):
        for concept, probability in zip(cargo.job.cota.concepts, probabilities):
            sentence.concept_probabilities[concept.id] = probability

    return cargo
