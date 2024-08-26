from enum import Enum

from app.core.data.crud.action import crud_action
from app.core.data.crud.analysis_table import crud_analysis_table
from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.code import crud_code
from app.core.data.crud.concept_over_time_analysis import crud_cota
from app.core.data.crud.current_code import crud_current_code
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.entity import crud_entity
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.object_handle import crud_object_handle
from app.core.data.crud.preprocessing_job import crud_prepro_job
from app.core.data.crud.preprocessing_job_payload import crud_prepro_job_payload
from app.core.data.crud.project import crud_project
from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_data import crud_sdoc_data
from app.core.data.crud.source_document_link import crud_sdoc_link
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.span_group import crud_span_group
from app.core.data.crud.span_text import crud_span_text
from app.core.data.crud.span_text_entity_link import crud_span_text_entity_link
from app.core.data.crud.timeline_analysis import crud_timeline_analysis
from app.core.data.crud.user import crud_user
from app.core.data.crud.whiteboard import crud_whiteboard


class Crud(Enum):
    ACTION = crud_action
    ANALYSIS_TABLE = crud_analysis_table
    ANNOTATION_DOCUMENT = crud_adoc
    BBOX_ANNOTATION = crud_bbox_anno
    CODE = crud_code
    CURRENT_CODE = crud_current_code
    DOCUMENT_TAG = crud_document_tag
    MEMO = crud_memo
    OBJECT_HANDLE = crud_object_handle
    PREPROCESSING_JOB_PAYLOAD = crud_prepro_job_payload
    PREPROCESSING_JOB = crud_prepro_job
    PROJECT = crud_project
    PROJECT_METADATA = crud_project_meta
    SOURCE_DOCUMENT_DATA = crud_sdoc_data
    SOURCE_DOCUMENT_LINK = crud_sdoc_link
    SOURCE_DOCUMENT_METADATA = crud_sdoc_meta
    SOURCE_DOCUMENT = crud_sdoc
    SPAN_ANNOTATION = crud_span_anno
    SPAN_GROUP = crud_span_group
    SPAN_TEXT = crud_span_text
    TIMELINE_ANALYSIS = crud_timeline_analysis
    COTA_ANALYSIS = crud_cota
    USER = crud_user
    WHITEBOARD = crud_whiteboard
    ENTITY = crud_entity
    SPAN_TEXT_ENTITY_LINK = crud_span_text_entity_link
