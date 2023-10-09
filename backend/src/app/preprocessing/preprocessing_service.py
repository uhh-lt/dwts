from pathlib import Path
from typing import Dict, List, Optional

import magic
from app.celery.background_jobs import (
    execute_audio_preprocessing_pipeline_apply_async,
    execute_image_preprocessing_pipeline_apply_async,
    execute_text_preprocessing_pipeline_apply_async,
    execute_video_preprocessing_pipeline_apply_async,
)
from app.core.data.crud.preprocessing_job import crud_prepro_job
from app.core.data.doc_type import (
    DocType,
    get_doc_type,
    is_archive_file,
    mime_type_supported,
)
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.preprocessing_job import (
    PreprocessingJobCreate,
    PreprocessingJobRead,
    PreprocessingJobUpdate,
)
from app.core.data.dto.preprocessing_job_payload import (
    PreprocessingJobPayloadCreateWithoutPreproJobId,
)
from app.core.data.repo.repo_service import (
    FileNotFoundInRepositoryError,
    RepoService,
    UnsupportedDocTypeForSourceDocument,
)
from app.core.db.sql_service import SQLService
from app.preprocessing.pipeline.model.pipeline_cargo import PipelineCargo
from app.preprocessing.pipeline.preprocessing_pipeline import PreprocessingPipeline
from app.util.singleton_meta import SingletonMeta
from fastapi import HTTPException, UploadFile
from loguru import logger
from tqdm import tqdm


class PreprocessingService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls: SQLService = SQLService()
        cls.repo: RepoService = RepoService()
        cls._pipelines: Dict[DocType, PreprocessingPipeline] = dict()

        return super(PreprocessingService, cls).__new__(cls)

    def _store_uploaded_files_and_create_payloads(
        self, proj_id: int, uploaded_files: List[UploadFile]
    ) -> List[PreprocessingJobPayloadCreateWithoutPreproJobId]:
        payloads: List[PreprocessingJobPayloadCreateWithoutPreproJobId] = []
        for uploaded_file in uploaded_files:
            mime_type = uploaded_file.content_type
            if not mime_type_supported(mime_type=mime_type):
                raise HTTPException(
                    detail=f"Document with MIME type {mime_type} not supported!",
                    status_code=406,
                )

            file_path = self.repo.store_uploaded_file_in_project_repo(
                proj_id=proj_id, uploaded_file=uploaded_file
            )

            if is_archive_file(mime_type):
                # if the uploaded file is an archive, we extract it and create
                # PreprocessingJobPayloads for each file in the archive
                payloads.extend(
                    self._extract_archive_and_create_payloads(
                        project_id=proj_id, archive_file_path=file_path
                    )
                )
                continue

            doc_type = get_doc_type(mime_type=mime_type)

            payloads.append(
                PreprocessingJobPayloadCreateWithoutPreproJobId(
                    project_id=proj_id,
                    filename=file_path.name,
                    mime_type=mime_type,
                    doc_type=doc_type,
                )
            )
        return payloads

    def _create_ppj_payloads_from_unimported_project_files(
        self,
        unimported_project_files: List[Path],
        project_id: int,
    ) -> List[PreprocessingJobPayloadCreateWithoutPreproJobId]:

        payloads: List[PreprocessingJobPayloadCreateWithoutPreproJobId] = []

        for file_path in tqdm(
            unimported_project_files,
            total=len(unimported_project_files),
            desc=(
                "Creating PreprocessingJobPayloads from "
                f"{len(unimported_project_files)} unimported project files... "
            ),
        ):
            try:
                mime_type = magic.from_file(file_path, mime=True)
                doc_type = get_doc_type(mime_type=mime_type)

                payloads.append(
                    PreprocessingJobPayloadCreateWithoutPreproJobId(
                        project_id=project_id,
                        filename=file_path.name,
                        mime_type=mime_type,
                        doc_type=doc_type,
                    )
                )

            except (
                FileNotFoundInRepositoryError,
                UnsupportedDocTypeForSourceDocument,
                Exception,
            ) as e:
                logger.warning(
                    f"Skipping import of file {file_path.name} because:\n {e}!"
                )
                continue

        return payloads

    def _extract_archive_and_create_payloads(
        self, project_id: int, archive_file_path: Path
    ) -> List[PreprocessingJobPayloadCreateWithoutPreproJobId]:
        # store and extract the archive
        file_dsts: List[Path] = self.repo.extract_archive_in_project(
            proj_id=project_id, archive_path=archive_file_path
        )
        return self._create_ppj_payloads_from_unimported_project_files(
            unimported_project_files=file_dsts, project_id=project_id
        )

    def _create_and_store_preprocessing_job(
        self,
        proj_id: int,
        payloads: List[PreprocessingJobPayloadCreateWithoutPreproJobId],
    ) -> PreprocessingJobRead:
        create_dto = PreprocessingJobCreate(project_id=proj_id, payloads=payloads)
        try:
            with self.sqls.db_session() as db:
                db_obj = crud_prepro_job.create(db=db, create_dto=create_dto)
                read_dto = PreprocessingJobRead.from_orm(db_obj)
        except Exception as e:
            raise HTTPException(
                detail=f"Could not store PreprocessingJob! {e}", status_code=500
            )

        logger.info(
            (
                f"Created PreprocessingJob {read_dto.id} to import {len(payloads)}"
                "documents asynchronously!"
            )
        )

        return read_dto

    def _create_pipeline_cargos_from_preprocessing_job(
        self,
        ppj: PreprocessingJobRead,
    ) -> Dict[DocType, List[PipelineCargo]]:
        # create the PipelineCargos for the different DocTypes
        cargos: Dict[DocType, List[PipelineCargo]] = dict()
        for payload in ppj.payloads:
            if payload.doc_type not in cargos:
                cargos[payload.doc_type] = [
                    PipelineCargo(ppj_payload=payload, ppj_id=ppj.id)
                ]
            else:
                cargos[payload.doc_type].append(
                    PipelineCargo(ppj_payload=payload, ppj_id=ppj.id)
                )
        return cargos

    def abort_preprocessing_job(self, ppj_id: str) -> PreprocessingJobRead:
        logger.info(f"Aborting PreprocessingJob {ppj_id}...")
        with self.sqls.db_session() as db:
            db_obj = crud_prepro_job.read(db=db, uuid=ppj_id)
            ppj = PreprocessingJobRead.from_orm(db_obj)
        if ppj.status != BackgroundJobStatus.RUNNING:
            raise HTTPException(
                detail=(
                    f"Cannot abort PreprocessingJob {ppj_id} "
                    "because it is not running!"
                ),
                status_code=400,
            )
        with self.sqls.db_session() as db:
            db_obj = crud_prepro_job.update(
                db=db,
                uuid=ppj_id,
                update_dto=PreprocessingJobUpdate(status=BackgroundJobStatus.ABORTED),
            )
            ppj = PreprocessingJobRead.from_orm(db_obj)
        return ppj

    def _create_and_start_preprocessing_job_from_payloads_async(
        self,
        payloads: List[PreprocessingJobPayloadCreateWithoutPreproJobId],
        proj_id: int,
    ) -> Optional[PreprocessingJobRead]:
        if len(payloads) == 0:
            return None
        logger.info(
            f"Creating PreprocessingJob in Project {proj_id} "
            f"for {len(payloads)} documents ..."
        )

        ppj = self._create_and_store_preprocessing_job(proj_id, payloads)

        cargos = self._create_pipeline_cargos_from_preprocessing_job(ppj=ppj)

        for doc_type in cargos.keys():
            if doc_type == DocType.text:
                execute_text_preprocessing_pipeline_apply_async(cargos=cargos[doc_type])
            elif doc_type == DocType.image:
                execute_image_preprocessing_pipeline_apply_async(
                    cargos=cargos[doc_type]
                )
            elif doc_type == DocType.audio:
                execute_audio_preprocessing_pipeline_apply_async(
                    cargos=cargos[doc_type]
                )
            elif doc_type == DocType.video:
                execute_video_preprocessing_pipeline_apply_async(
                    cargos=cargos[doc_type]
                )
            else:
                raise HTTPException(
                    detail=f"Unsupported DocType {doc_type}!", status_code=500
                )

        # update the PreprocessingJob status to IN_PROGRESS
        with self.sqls.db_session() as db:
            db_obj = crud_prepro_job.update(
                db=db,
                uuid=ppj.id,
                update_dto=PreprocessingJobUpdate(status=BackgroundJobStatus.RUNNING),
            )
            ppj = PreprocessingJobRead.from_orm(db_obj)

        return ppj

    def prepare_and_start_preprocessing_job_async(
        self,
        *,
        proj_id: int,
        uploaded_files: Optional[List[UploadFile]] = None,
        archive_file_path: Optional[Path] = None,
        unimported_project_files: Optional[List[Path]] = None,
    ) -> Optional[PreprocessingJobRead]:
        if (
            uploaded_files is not None
            and archive_file_path is not None
            and unimported_project_files is not None
        ):
            raise ValueError(
                "Either uploaded_files or archive_file_path or unimported_project_files"
                " must be specified, but not both!"
            )
        elif uploaded_files is not None:
            payloads = self._store_uploaded_files_and_create_payloads(
                proj_id=proj_id, uploaded_files=uploaded_files
            )
        elif archive_file_path is not None:
            payloads = self._extract_archive_and_create_payloads(
                project_id=proj_id, archive_file_path=archive_file_path
            )
        elif unimported_project_files is not None:
            payloads = self._create_ppj_payloads_from_unimported_project_files(
                unimported_project_files=unimported_project_files,
                project_id=proj_id,
            )
        else:
            raise ValueError(
                "Either uploaded_files or archive_file_path must be specified!"
            )

        return self._create_and_start_preprocessing_job_from_payloads_async(
            payloads=payloads,
            proj_id=proj_id,
        )

    def _get_pipeline(self, doc_type: DocType) -> PreprocessingPipeline:
        if doc_type not in self._pipelines:
            self._pipelines[doc_type] = PreprocessingPipeline(
                doc_type=doc_type, num_workers=1, force_sequential=True
            )
        return self._pipelines[doc_type]

    def get_text_pipeline(self) -> PreprocessingPipeline:
        from app.preprocessing.pipeline import build_text_pipeline

        if DocType.text not in self._pipelines:
            pipeline = build_text_pipeline()
            self._pipelines[DocType.text] = pipeline
        return self._pipelines[DocType.text]

    def get_image_pipeline(self) -> PreprocessingPipeline:
        from app.preprocessing.pipeline import build_image_pipeline

        if DocType.image not in self._pipelines:
            pipeline = build_image_pipeline()
            self._pipelines[DocType.image] = pipeline
        return self._pipelines[DocType.image]

    def get_audio_pipeline(self) -> PreprocessingPipeline:
        from app.preprocessing.pipeline import build_audio_pipeline

        if DocType.audio not in self._pipelines:
            pipeline = build_audio_pipeline()
            self._pipelines[DocType.audio] = pipeline
        return self._pipelines[DocType.audio]

    def get_video_pipeline(self) -> PreprocessingPipeline:
        from app.preprocessing.pipeline import build_video_pipeline

        if DocType.video not in self._pipelines:
            pipeline = build_video_pipeline()
            self._pipelines[DocType.video] = pipeline
        return self._pipelines[DocType.video]
