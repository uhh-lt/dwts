from datetime import datetime
from typing import Dict, List, Optional

from app.core.analysis.cota.pipeline.cargo import Cargo
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.concept_over_time_analysis import (
    COTASentence,
)
from app.core.data.dto.search import SimSearchQuery
from app.core.data.dto.source_document import SourceDocumentWithDataRead
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.db.sql_service import SQLService
from app.core.search.simsearch_service import SimSearchService

sqls: SQLService = SQLService()
sims: SimSearchService = SimSearchService()


def init_search_space(cargo: Cargo) -> Cargo:
    cota = cargo.job.cota

    # the search space is not empty, we dont need to do anything
    if len(cota.search_space) > 0:
        cargo.data["search_space"] = cota.search_space
        return cargo

    # the search space is empty, we build the search space with simsearch
    search_space_dict: Dict[
        str, COTASentence
    ] = dict()  # we use a dict here to prevent duplicates in the search space
    for concept in cota.concepts:
        # find similar sentences for each concept to define search space
        sents = sims.find_similar_sentences(
            query=SimSearchQuery(
                proj_id=cota.project_id,
                query=concept.description,
                top_k=cota.training_settings.search_space_topk,
                threshold=cota.training_settings.search_space_threshold,
            )
        )

        for sent in sents:
            cota_sentence_id = f"{sent.sentence_id}-{sent.sdoc_id}"
            cota_sentence = search_space_dict.get(
                cota_sentence_id,
                COTASentence(
                    sdoc_id=sent.sdoc_id,
                    sentence_id=sent.sentence_id,
                    concept_annotation=None,
                    concept_similarities={concept.id: 0.0 for concept in cota.concepts},
                    concept_probabilities={
                        concept.id: 1 / len(cota.concepts) for concept in cota.concepts
                    },
                    x=0.0,
                    y=0.0,
                    date=datetime.now(),
                    text="",
                ),
            )
            cota_sentence.concept_similarities[concept.id] = sent.score
            search_space_dict[cota_sentence_id] = cota_sentence

    search_space = list(search_space_dict.values())

    # add the sentences to the search space
    search_space = add_sentences_to_search_space(search_space=search_space)

    # add the date to the search space
    search_space = add_dates_to_search_space(
        date_metadata_id=cota.timeline_settings.date_metadata_id,
        search_space=search_space,
    )

    # update the cota with the search space
    cargo.data["search_space"] = search_space

    return cargo


def add_sentences_to_search_space(
    search_space: List[COTASentence],
) -> List[COTASentence]:
    sdoc_ids = list(set([cota_sent.sdoc_id for cota_sent in search_space]))

    # get the data from the database
    with sqls.db_session() as db:
        sdoc_data = crud_sdoc.read_with_data_batch(db=db, ids=sdoc_ids)

    # map the data
    sdoc_id2sdocreadwithdata: Dict[int, SourceDocumentWithDataRead] = {
        sdoc_data_read.id: sdoc_data_read for sdoc_data_read in sdoc_data
    }

    sentences = []
    for cota_sent in search_space:
        if cota_sent.sdoc_id not in sdoc_id2sdocreadwithdata:
            raise ValueError(
                f"Could not find SourceDocumentWithDataRead for sdoc_id {cota_sent.sdoc_id}!"
            )
        sdoc_data_read = sdoc_id2sdocreadwithdata[cota_sent.sdoc_id]

        if cota_sent.sentence_id >= len(sdoc_data_read.sentences):
            raise ValueError(
                f"Could not find sentence with id {cota_sent.sentence_id} in SourceDocumentWithDataRead with id {sdoc_data_read.id}!"
            )
        sentences.append(sdoc_data_read.sentences[cota_sent.sentence_id])

    # add the sentences
    assert len(sentences) == len(search_space)
    for sentence, cota_sent in zip(sentences, search_space):
        cota_sent.text = sentence

    return search_space


def add_dates_to_search_space(
    date_metadata_id: Optional[int], search_space: List[COTASentence]
) -> List[COTASentence]:
    sdoc_ids = list(set([cota_sent.sdoc_id for cota_sent in search_space]))

    # 2. find the date for every sdoc that is in the search space
    sdoc_id_to_date: Dict[int, datetime] = dict()

    # this is only possible if the cota has a date_metadata_id
    if date_metadata_id is not None:
        with sqls.db_session() as db:
            query = (
                db.query(
                    SourceDocumentORM.id,
                    SourceDocumentMetadataORM.date_value,
                )
                .join(SourceDocumentORM.metadata_)
                .filter(
                    SourceDocumentORM.id.in_(sdoc_ids),
                    SourceDocumentMetadataORM.project_metadata_id == date_metadata_id,
                    SourceDocumentMetadataORM.date_value.isnot(None),
                )
            )
            result_rows = query.all()

        for row in result_rows:
            sdoc_id_to_date[row[0]] = row[1]

    # otherwise, we set the date to today for every sdoc
    else:
        for sdoc_id in sdoc_ids:
            sdoc_id_to_date[sdoc_id] = datetime.now()

    # 3. update search_space with the date
    for sentence in search_space:
        sentence.date = sdoc_id_to_date[sentence.sdoc_id]

    return search_space
