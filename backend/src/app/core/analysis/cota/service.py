from typing import Dict, List

import srsly
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.core.data.crud.concept_over_time_analysis import (
    CRUDConceptOverTimeAnalysis,
    crud_cota,
)
from app.core.data.dto.concept_over_time_analysis import (
    COTACreate,
    COTARead,
    COTASentence,
    COTAUpdate,
    COTAUpdateAsInDB,
)
from app.core.data.dto.search import SimSearchQuery
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.simsearch_service import SimSearchService
from app.trainer.trainer_service import TrainerService
from app.util.singleton_meta import SingletonMeta


class COTAService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.crud: CRUDConceptOverTimeAnalysis = crud_cota
        cls.trainer: TrainerService = TrainerService()
        cls.sims: SimSearchService = SimSearchService()
        cls.es: ElasticSearchService = ElasticSearchService()

        cls.max_search_space_per_concept: int = 1000
        cls.search_space_sim_search_threshold: float = 0.5

        return super(COTAService, cls).__new__(cls)

    def __resolve_sentences_text(self, cota: COTARead) -> COTARead:
        sdoc2sentences = dict()
        for sent in cota.sentence_search_space:
            if sent.sdoc_id not in sdoc2sentences:
                sdoc2sentences[sent.sdoc_id] = []
            sdoc2sentences[sent.sdoc_id].append(sent.sentence_id)

        sentid2text = dict()
        for sdoc_id, sentences in sdoc2sentences.items():
            sdoc_sentences = self.es.get_sdoc_sentences_by_sdoc_id(
                proj_id=cota.project_id, sdoc_id=sdoc_id
            )
            if sdoc_sentences is not None:
                for sent_id in sentences:
                    sentid2text[sent_id] = sdoc_sentences.sentences[sent_id]

        sentence_search_space = [
            COTASentence(
                **sent.model_dump(exclude={"text"}), text=sentid2text[sent.sentence_id]
            )
            for sent in cota.sentence_search_space
        ]
        cota.sentence_search_space = sentence_search_space
        return cota

    def create(self, db: Session, cota_create: COTACreate) -> COTARead:
        db_obj = self.crud.create(db=db, create_dto=cota_create)
        return COTARead.model_validate(db_obj)

    def read_by_id(
        self, *, db: Session, cota_id: int, return_sentence_text: bool = False
    ) -> COTARead:
        db_obj = self.crud.read(db=db, id=cota_id)
        cota = COTARead.model_validate(db_obj)
        if return_sentence_text:
            cota = self.__resolve_sentences_text(cota)
        return cota

    def read_by_project_and_user(
        self,
        *,
        db: Session,
        project_id: int,
        user_id: int,
        return_sentence_text: bool = False
    ) -> List[COTARead]:
        db_objs = self.crud.read_by_project_and_user(
            db=db, project_id=project_id, user_id=user_id, raise_error=False
        )
        cotas = [COTARead.model_validate(db_obj) for db_obj in db_objs]
        if return_sentence_text:
            return [self.__resolve_sentences_text(cota) for cota in cotas]
        return cotas

    def update(
        self,
        *,
        db: Session,
        cota_id: int,
        cota_update: COTAUpdate,
        return_sentence_text: bool = False
    ) -> COTARead:
        cota = self.read_by_id(
            db=db, cota_id=cota_id, return_sentence_text=return_sentence_text
        )
        if cota_update.concepts is not None:
            # the concepts get updated to we have to reset the sentence search space
            sentence_search_space: Dict[int, COTASentence] = dict()
            for concept in cota_update.concepts:
                # first, find similar sentences for each concept to define the
                # search space for the COTA
                sents = self.sims.find_similar_sentences(
                    query=SimSearchQuery(
                        proj_id=cota.project_id,
                        query=concept.description,
                        top_k=self.max_search_space_per_concept,
                        threshold=self.search_space_sim_search_threshold,
                    )
                )
                sentence_search_space.update(
                    {
                        sent.sentence_id: COTASentence(
                            sentence_id=sent.sentence_id,
                            sdoc_id=sent.sdoc_id,
                        )
                        for sent in sents
                    }
                )

            # we have to dump the concepts and the sentence search space to json
            concepts_str = srsly.json_dumps(jsonable_encoder(cota_update.concepts))
            sentence_search_space_str = srsly.json_dumps(
                jsonable_encoder(list(sentence_search_space.values()))
            )

            update_dto_as_in_db = COTAUpdateAsInDB(
                **cota_update.model_dump(exclude={"concepts"}, exclude_none=True),
                sentence_search_space=sentence_search_space_str,
                concepts=concepts_str,
            )
        else:
            update_dto_as_in_db = COTAUpdateAsInDB(
                **cota_update.model_dump(exclude={"concepts"}, exclude_none=True)
            )

        db_obj = self.crud.update(db=db, id=cota_id, update_dto=update_dto_as_in_db)
        cota = COTARead.model_validate(db_obj)
        if return_sentence_text:
            return self.__resolve_sentences_text(cota)
        return cota

    def delete_by_id(self, *, db: Session, cota_id: int) -> COTARead:
        db_obj = self.crud.remove(db=db, id=cota_id)
        return COTARead.model_validate(db_obj)
