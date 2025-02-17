# ignore unused imports for this file
# ruff: noqa: F401
"""we import all ORM here so that SQLAlchemy knows about them to generate the SQL tables"""

from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.concept_over_time_analysis import ConceptOverTimeAnalysisORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.object_handle import ObjectHandleORM
from app.core.data.orm.orm_base import ORMBase
from app.core.data.orm.preprocessing_job import PreprocessingJobORM
from app.core.data.orm.preprocessing_job_payload import PreprocessingJobPayloadORM
from app.core.data.orm.project import ProjectORM, ProjectUserLinkTable
from app.core.data.orm.project_metadata import ProjectMetadataORM
from app.core.data.orm.refresh_token import RefreshTokenORM
from app.core.data.orm.sentence_annotation import SentenceAnnotationORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_data import SourceDocumentDataORM
from app.core.data.orm.source_document_link import SourceDocumentLinkORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM
from app.core.data.orm.whiteboard import WhiteboardORM
from app.core.data.orm.word_frequency import WordFrequencyORM
