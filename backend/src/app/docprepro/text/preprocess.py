import json
import os
from pathlib import Path
from typing import List, Dict, Union

import spacy
import torch
from loguru import logger
from spacy import Language
from tqdm import tqdm

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.code import crud_code
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_link import crud_sdoc_link
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.annotation_document import AnnotationDocumentCreate
from app.core.data.dto.search import ElasticSearchDocumentCreate, ElasticSearchIntegerRange
from app.core.data.dto.source_document import SDocStatus
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataCreate
from app.core.data.dto.span_annotation import SpanAnnotationCreate
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.core.search.elasticsearch_service import ElasticSearchService
from app.docprepro.celery.celery_worker import celery_worker
from app.docprepro.image import PreProImageDoc
from app.docprepro.text.html_text_mapper import HTMLTextMapper
from app.docprepro.text.preprotextdoc import PreProTextDoc
from app.docprepro.text.util import generate_preprotextdoc, generate_automatic_span_annotations_sequentially, \
    generate_automatic_span_annotations_pipeline
from app.docprepro.util import persist_as_sdoc, update_sdoc_status, update_es_sdoc_html_with_resolved_links
from config import conf

# https://github.com/explosion/spaCy/issues/8678
torch.set_num_threads(1)


def __start_apache_tika_server() -> None:
    logger.info("Starting Apache Tika Server...")
    # start by parsing a random text file (hacky, I know...)
    from tika import parser
    tika_starter_dummy = "/tmp/tika_starter_dummy.txt"
    with open(tika_starter_dummy, 'w') as f:
        f.write("tika_starter_dummy")
    parser.from_file(tika_starter_dummy)
    os.remove(tika_starter_dummy)
    logger.info("Starting Apache Tika Server... Done!")


def __load_spacy_models() -> Dict[str, Language]:
    if conf.docprepro.text.spacy.device == "cuda":
        spacy.prefer_gpu()

    logger.info(f"Starting to load spaCy Models...")

    nlp: Dict[str, Language] = dict()

    for lang, model in conf.docprepro.text.spacy.models.items():
        if lang == "default":
            continue
        logger.info(f"Loading spaCy Model '{model}' ...")
        nlp[lang] = spacy.load(model)

    logger.info(f"Starting to load spaCy Models... Done!")

    nlp["default"] = nlp[conf.docprepro.text.spacy.models.default]

    for lang in nlp.values():
        lang.max_length = conf.docprepro.text.spacy.max_text_length

    return nlp


spacy_models = __load_spacy_models()
__start_apache_tika_server()

BULK_THRESHOLD = conf.docprepro.text.bulk_threshold

# TODO Flo: maybe we want to break all process tasks up in smaller functions for better readability and modularity...
#  However, this would be _little_ less efficient

sql = SQLService(echo=False)
repo = RepoService()
es = ElasticSearchService()


@celery_worker.task(acks_late=True)
def import_uploaded_text_document(doc_file_path: Path,
                                  project_id: int) -> List[PreProTextDoc]:
    dst, sdoc_db_obj = persist_as_sdoc(doc_file_path, project_id)
    pptd = generate_preprotextdoc(filepath=dst, sdoc_db_obj=sdoc_db_obj)

    update_sdoc_status(sdoc_id=sdoc_db_obj.id, sdoc_status=SDocStatus.imported_uploaded_text_document)
    # Flo: We return a list here so that we can use text PrePro also with archives which contain multiple docs
    return [pptd]


@celery_worker.task(acks_late=True)
def build_text_to_html_mapping(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    parser = HTMLTextMapper()
    for pptd in tqdm(pptds, desc="Parsing html... "):
        results = parser(pptd.html)

        text = " ".join([r["text"] for r in results])
        pptd.text = text

        text2html_character_offsets = []
        for result in results:
            for index in range(result['start'], result['end'] + 1):
                text2html_character_offsets.append(index)
        pptd.text2html_character_offsets = text2html_character_offsets

    return pptds


@celery_worker.task(acks_late=True)
def generate_automatic_span_annotations(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    global spacy_models

    # Flo: SDoc Status is updated in util methods
    if len(pptds) < BULK_THRESHOLD:
        return generate_automatic_span_annotations_sequentially(pptds, spacy_models)
    return generate_automatic_span_annotations_pipeline(pptds, spacy_models)


@celery_worker.task(acks_late=True)
def persist_automatic_span_annotations(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    for pptd in tqdm(pptds, desc="Persisting Automatic SpanAnnotations... "):
        # create AnnoDoc for system user
        with SQLService().db_session() as db:

            # Flo: since we're sending the automatically generated caption from image docs as pptds it could be
            #  that there already is an adoc (with BBox Annos) for the system user and sdoc
            if not crud_adoc.exists_by_sdoc_and_user(db=db, sdoc_id=pptd.sdoc_id, user_id=SYSTEM_USER_ID):
                adoc_create = AnnotationDocumentCreate(source_document_id=pptd.sdoc_id,
                                                       user_id=SYSTEM_USER_ID)
                adoc_db = crud_adoc.create(db=db, create_dto=adoc_create)
            else:
                adoc_db = crud_adoc.read_by_sdoc_and_user(db=db, sdoc_id=pptd.sdoc_id, user_id=SYSTEM_USER_ID)

            # convert AutoSpans to SpanAnnotations
            for code in pptd.spans.keys():
                for aspan in pptd.spans[code]:
                    # FIXME Flo: hacky solution for German NER model, which only contains ('LOC', 'MISC', 'ORG', 'PER')
                    if aspan.code == "PER":
                        aspan.code = "PERSON"
                    db_code = crud_code.read_by_name_and_user_and_project(db,
                                                                          code_name=aspan.code,
                                                                          user_id=SYSTEM_USER_ID,
                                                                          proj_id=pptd.project_id)

                    if not db_code:
                        # FIXME FLO: create code on the fly for system user?
                        logger.warning(f"No Code <{aspan.code}> found! Skipping persistence of SpanAnnotation ...")
                        continue

                    ccid = db_code.current_code.id

                    create_dto = SpanAnnotationCreate(begin=aspan.start,
                                                      end=aspan.end,
                                                      current_code_id=ccid,
                                                      annotation_document_id=adoc_db.id,
                                                      span_text=aspan.text,
                                                      begin_token=aspan.start_token,
                                                      end_token=aspan.end_token)

                    crud_span_anno.create(db, create_dto=create_dto)

            # persist word frequencies
            sdoc_meta_create_dto = SourceDocumentMetadataCreate(key="word_frequencies",
                                                                value=json.dumps(pptd.word_freqs).replace("\"", "'"),
                                                                source_document_id=pptd.sdoc_id,
                                                                read_only=True)
            sdoc_meta_db_obj = crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)

        # Flo: update sdoc status
        update_sdoc_status(sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.persisted_automatic_span_annotations)

    return pptds


@celery_worker.task(acks_late=True)
def add_custom_tags_to_html(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds

    for pptd in tqdm(pptds, desc="Generating html with custom tags... "):
        new_html = ""
        current_position = 0

        sentences = pptd.spans["SENTENCE"]
        current_sentence_idx = 0

        for token_id, (text_start, text_end) in enumerate(pptd.token_character_offsets):
            html_start = pptd.text2html_character_offsets[text_start]
            html_end = pptd.text2html_character_offsets[text_end]

            new_html += pptd.html[current_position:html_start]

            if sentences[current_sentence_idx].end_token == token_id:
                new_html += f'</sent>'
                current_sentence_idx += 1

            if sentences[current_sentence_idx].start_token == token_id:
                new_html += f'<sent id={current_sentence_idx}>'

            new_html += f'<t id={token_id}>'
            new_html += pptd.html[html_start:html_end]
            new_html += '</t>'

            current_position = html_end

        new_html += pptd.html[current_position:]

        pptd.html = new_html

    return pptds


@celery_worker.task(acks_late=True)
def add_document_to_elasticsearch_index(pptds: List[PreProTextDoc]) -> List[PreProTextDoc]:
    if len(pptds) == 0:
        return pptds
    # Flo: we assume that every pptd originates from the same project!
    proj_id = pptds[0].project_id

    esdocs = list(map(lambda pptd: ElasticSearchDocumentCreate(filename=pptd.filename,
                                                               content=pptd.text,
                                                               html=pptd.html,
                                                               tokens=pptd.tokens,
                                                               token_character_offsets=[
                                                                   ElasticSearchIntegerRange(gte=o[0], lt=o[1])
                                                                   for o in pptd.token_character_offsets
                                                               ],
                                                               keywords=pptd.keywords,
                                                               sdoc_id=pptd.sdoc_id,
                                                               project_id=pptd.project_id), pptds))
    if len(pptds) <= BULK_THRESHOLD:
        for esdoc in tqdm(esdocs, desc="Adding documents to ElasticSearch... "):
            es.add_document_to_index(proj_id=proj_id, esdoc=esdoc)

            # Flo: update sdoc status
            update_sdoc_status(sdoc_id=esdoc.sdoc_id, sdoc_status=SDocStatus.added_document_to_elasticsearch_index)
    else:

        es.bulk_add_documents_to_index(proj_id=proj_id, esdocs=esdocs)

        # Flo: update sdoc status
        for pptd in pptds:
            update_sdoc_status(sdoc_id=pptd.sdoc_id, sdoc_status=SDocStatus.added_document_to_elasticsearch_index)

    return pptds


@celery_worker.task(acks_late=True)
def finish_preprocessing(ppds: List[Union[PreProTextDoc, PreProImageDoc]]) -> None:
    with sql.db_session() as db:
        resolved_links = crud_sdoc_link.resolve_filenames_to_sdoc_ids(db=db)
        update_es_sdoc_html_with_resolved_links(resolved_links=resolved_links, proj_id=ppds[0].project_id)
        for ppd in ppds:
            crud_sdoc.update_status(db=db,
                                    sdoc_id=ppd.sdoc_id,
                                    sdoc_status=SDocStatus.finished)
