import random
from typing import Dict, List

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.llm.prompts.prompt_builder import PromptBuilder
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from config import conf

sent_anno_conf = conf.llm_assistant.sentence_annotation


class OllamaParsedSentenceAnnotationResult(BaseModel):
    sent_id: int
    code_id: int


class OllamaSentenceAnnotationResult(BaseModel):
    sent_id: int
    category: str


class OllamaSentenceAnnotationResults(BaseModel):
    data: List[OllamaSentenceAnnotationResult]


# ENGLISH

en_prompt_template = """
Please use the following categories to classify sentences of the provided document:
{}

Please answer in this format. Do not provide your reasoning. Only use the provided categories.
Sentence ID: <sentence number>
Category: <category>

e.g.
{}

This is the document, sentence by sentence:
<document>

Remember to provide a category for each sentence. You are NOT ALLOWED to use any category other than those provided.
"""

en_example_template = """
Sentence ID: {}
Category: {}
"""


# GERMAN

de_prompt_template = """
Bitte nutze die folgenden Kategorien um Sätze des gegebenen Dokumentes zu klassifizieren:
{}

Bitte anworte in diesem Format. Gebe keine Begründung an. Verwende nur die bereitgestellten Kategorien.
Satz ID: <Satz Nummer>
Kategorie: <Kategorie>

e.g.
{}

Dies ist das Dokument, Satz für Satz:
<document>

Denke daran, dass du für jeden Satz eine Kategorie angeben musst. Du darfst KEINE andere Kategorie als die bereitgestellten verwenden.
"""

de_example_template = """
Satz ID: {}
Kategorie: {}
"""


class SentenceAnnotationPromptBuilder(PromptBuilder):
    supported_languages = ["en", "de"]
    prompt_templates = {
        "en": en_prompt_template.strip(),
        "de": de_prompt_template.strip(),
    }
    example_templates = {
        "en": en_example_template.strip(),
        "de": de_example_template.strip(),
    }

    def __init__(self, db: Session, project_id: int, is_fewshot: bool):
        super().__init__(db, project_id, is_fewshot)

        project = crud_project.read(db=db, id=project_id)
        self.db = db
        self.codes = project.codes
        self.codename2id_dict = {code.name.lower(): code.id for code in self.codes}
        self.codeid2name_dict = {code.id: code.name for code in self.codes}
        self.codeids2code_dict = {code.id: code for code in self.codes}

    def _build_example(self, language: str, code_ids: List[int]) -> str:
        examples: List[str] = []
        for code_id in code_ids:
            if code_id not in self.codeid2name_dict:
                continue
            examples.append(self.codeid2name_dict[code_id])

        if len(examples) == 0:
            # choose 3 random examples
            examples.extend(random.sample(list(self.codeid2name_dict.values()), 3))

        examples = [
            self.example_templates[language].format(idx, example)
            for idx, example in enumerate(examples)
        ]

        return "\n".join(examples)

    def _build_user_prompt_template(
        self, language: str, code_ids: List[int], **kwargs
    ) -> str:
        if self.is_fewshot:
            from app.core.data.crud.sentence_annotation import crud_sentence_anno
            from app.core.data.crud.source_document import crud_sdoc

            # find sentence annotations
            sentence_annotations = [
                sa
                for sa in crud_sentence_anno.read_by_codes(
                    db=self.db, code_ids=code_ids
                )
                if sa.user_id
                != SYSTEM_USER_ID  # Filter out annotations of the system user
            ]
            code_id2sentence_annotations: Dict[int, List[SentenceAnnotationORM]] = {}
            for sa in sentence_annotations:
                if sa.code_id not in code_id2sentence_annotations:
                    code_id2sentence_annotations[sa.code_id] = []
                code_id2sentence_annotations[sa.code_id].append(sa)

            # check that there are at least 4 examples per code
            for code_id, annotations in code_id2sentence_annotations.items():
                assert len(annotations) >= sent_anno_conf.few_shot_threshold, (
                    f"Code {code_id} has less than {sent_anno_conf.few_shot_threshold} annotations!"
                )

            # find corrsponding sdoc datas
            sdoc_ids = [sa.sdoc_id for sa in sentence_annotations]
            sdoc_id2data = {
                sdoc.id: sdoc
                for sdoc in crud_sdoc.read_data_batch(db=self.db, ids=sdoc_ids)
                if sdoc is not None
            }

            # build task data
            task_data = "\n".join(
                [
                    f"{self.codeids2code_dict[code_id].name}: {self.codeids2code_dict[code_id].description} For example:\n"
                    + "\n".join(
                        [
                            "-"
                            + " ".join(
                                sdoc_id2data[sa.sdoc_id].sentences[
                                    sa.sentence_id_start : sa.sentence_id_end + 1
                                ]
                            )
                            for sa in code_id2sentence_annotations[code_id][0:4]
                        ]
                    )
                    + "\n"
                    for code_id in code_ids
                ]
            )
        else:
            task_data = "\n".join(
                [
                    f"{self.codeids2code_dict[code_id].name}: {self.codeids2code_dict[code_id].description}"
                    for code_id in code_ids
                ]
            )
        answer_example = self._build_example(language, code_ids)
        return self.prompt_templates[language].format(task_data, answer_example)

    def parse_result(
        self, result: OllamaSentenceAnnotationResults
    ) -> List[OllamaParsedSentenceAnnotationResult]:
        parsed_results = []
        for annotation in result.data:
            if annotation.category.lower() not in self.codename2id_dict:
                continue

            code_id = self.codename2id_dict[annotation.category.lower()]
            parsed_results.append(
                OllamaParsedSentenceAnnotationResult(
                    sent_id=annotation.sent_id, code_id=code_id
                )
            )
        return parsed_results
