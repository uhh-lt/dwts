from app.core.data.crud.crud_base import CRUDBase
from app.core.data.dto.source_document_job import (
    SourceDocumentJobCreate,
    SourceDocumentJobUpdate,
)
from app.core.data.orm.source_document_job import SourceDocumentJobORM


class CRUDSourceDocumentJob(
    CRUDBase[
        SourceDocumentJobORM,
        SourceDocumentJobCreate,
        SourceDocumentJobUpdate,
    ]
):
    pass


crud_sdoc_job = CRUDSourceDocumentJob(SourceDocumentJobORM)
