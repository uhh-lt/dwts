from typing import List

from pydantic import BaseModel, Field

from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.source_document import SourceDocumentRead


class DocumentClassificationJobParameters:
    project_id: int = Field(description="Project Id of documents to be classified.")
    sdoc_datas: List[SourceDocumentRead] = Field(
        description="List of documents that will be classified in the job."
    )


class DocumentClassificationJobBaseDTO(BaseModel):
    status: BackgroundJobStatus = Field(
        default=BackgroundJobStatus.WAITING,
        description="Status of the document classification job.",
    )


class DocumentClassificationJobCreate(DocumentClassificationJobBaseDTO):
    task_id: int = Field(description="Task Id of the document classification job.")


class DocumentClassificationJobRead(BaseModel):
    pass
