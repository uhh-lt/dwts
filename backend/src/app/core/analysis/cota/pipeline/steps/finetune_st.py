from typing import Dict, List

from datasets import Dataset
from setfit import SetFitModel, Trainer, TrainingArguments

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.analysis.cota.pipeline.steps.util import (
    _has_min_concept_sentence_annotations,
)
from app.core.data.dto.concept_over_time_analysis import (
    COTASentence,
)
from app.core.data.repo.repo_service import RepoService

repo: RepoService = RepoService()

# TODO: check if we can use a GPU here


def finetune_st(cargo: Cargo) -> Cargo:
    # Only train if we have enough annotated data
    if not _has_min_concept_sentence_annotations(cargo):
        return cargo

    search_space: List[COTASentence] = cargo.data["search_space"]
    sentences: List[str] = [ss.text for ss in search_space]

    # 1. Create the training data
    conceptid2label: Dict[str, int] = {
        concept.id: idx for idx, concept in enumerate(cargo.job.cota.concepts)
    }

    texts = []
    labels = []
    label_texts = []
    for idx, (ss_sentence, text) in enumerate(zip(search_space, sentences)):
        if ss_sentence.concept_annotation:
            texts.append(text)
            labels.append(conceptid2label[ss_sentence.concept_annotation])
            label_texts.append(ss_sentence.concept_annotation)

    train_dataset = Dataset.from_dict(
        ({"text": texts, "label": labels, "label_text": label_texts})
    )

    texts = []
    labels = []
    label_texts = []
    count = 0
    for idx, (ss_sentence, text) in enumerate(zip(search_space, sentences)):
        if ss_sentence.concept_annotation:
            texts.append(text)
            labels.append(conceptid2label[ss_sentence.concept_annotation])
            label_texts.append(ss_sentence.concept_annotation)
            count += 1

        if count >= 16:
            break
    eval_dataset = Dataset.from_dict(
        ({"text": texts, "label": labels, "label_text": label_texts})
    )

    # 2. load a SetFit model from Hub
    model = SetFitModel.from_pretrained(
        "sentence-transformers/paraphrase-mpnet-base-v2",
    )

    # 3. init training
    model_name = str(cargo.job.cota.id)
    model_path = repo.get_model_dir(
        proj_id=cargo.job.cota.project_id, model_name=model_name
    )
    args = TrainingArguments(
        batch_size=16,
        num_epochs=1,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        output_dir=str(model_path),
        report_to="none",
    )
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        metric="accuracy",
        column_mapping={
            "text": "text",
            "label": "label",
        },  # Map dataset columns to text/label expected by trainer
    )

    # 4. train
    trainer.train()

    # 5. store model
    model_name = f"{cargo.job.cota.id}-best-model"
    model_path = repo.get_model_dir(
        proj_id=cargo.job.cota.project_id, model_name=model_name
    )
    model.save_pretrained(model_path)

    return cargo
