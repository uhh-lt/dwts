from pathlib import Path
from typing import List

import ffmpeg

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.annotation_document import AnnotationDocumentCreate
from app.core.data.dto.source_document import SDocStatus, SourceDocumentRead
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataCreate,
)
from app.core.data.dto.preprocessing_job import PreprocessingJobPayload
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.docprepro.util import persist_as_sdoc, update_sdoc_status
from app.docprepro.video.models.preprovideodoc import PreProVideoDoc

sql = SQLService(echo=False)
repo = RepoService()


def import_video_document_(payload: PreprocessingJobPayload) -> List[PreProVideoDoc]:
    # persist in db
    dst, sdoc_db_obj = persist_as_sdoc(payload.filename, payload.project_id)

    # create ppvd
    ppvd = PreProVideoDoc(
        project_id=sdoc_db_obj.project_id,
        sdoc_id=sdoc_db_obj.id,
        video_dst=dst,
        mime_type=payload.mime_type,
    )
    ffmpeg_probe = ffmpeg.probe(dst)["format"]
    # store image metadata as SourceDocumentMetadata
    for meta in ffmpeg_probe:
        sdoc_meta_create_dto = SourceDocumentMetadataCreate(
            key=meta,
            value=str(ffmpeg_probe[meta]),
            source_document_id=sdoc_db_obj.id,
            read_only=True,
        )
        # persist SourceDocumentMetadata
        with sql.db_session() as db:
            crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)

        ppvd.metadata[sdoc_meta_create_dto.key] = sdoc_meta_create_dto.value

    # store the URL to the file as SourceDocumentMetadata
    sdoc = SourceDocumentRead.from_orm(sdoc_db_obj)
    sdoc_meta_create_dto = SourceDocumentMetadataCreate(
        key="url",
        value=str(repo.get_sdoc_url(sdoc=sdoc)),
        source_document_id=sdoc_db_obj.id,
        read_only=True,
    )
    # persist SourceDocumentMetadata
    with sql.db_session() as db:
        crud_sdoc_meta.create(db=db, create_dto=sdoc_meta_create_dto)
    ppvd.metadata[sdoc_meta_create_dto.key] = sdoc_meta_create_dto.value

    # here we hacky create the adoc for the SU since we dont have video annos yet
    adoc_db = crud_adoc.read_by_sdoc_and_user(
        db=db, sdoc_id=ppvd.sdoc_id, user_id=SYSTEM_USER_ID, raise_error=False
    )
    if not adoc_db:
        adoc_create = AnnotationDocumentCreate(
            source_document_id=ppvd.sdoc_id, user_id=SYSTEM_USER_ID
        )
        adoc_db = crud_adoc.create(db=db, create_dto=adoc_create)

    # update sdoc status
    update_sdoc_status(
        sdoc_id=ppvd.sdoc_id, sdoc_status=SDocStatus.import_video_document
    )

    # return a list so that we can use text PrePro also with archives which contain multiple docs
    return [ppvd]
