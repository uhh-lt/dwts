import zipfile
from pathlib import Path
from typing import Callable, Dict, List, Optional, Sequence, Tuple, Union
from uuid import uuid4

import pandas as pd
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.code import crud_code
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.user import crud_user
from app.core.data.dto.annotation_document import AnnotationDocumentRead
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.bbox_annotation import (
    BBoxAnnotationRead,
    BBoxAnnotationReadResolvedCode,
)
from app.core.data.dto.code import CodeRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.export_job import (
    ExportFormat,
    ExportJobCreate,
    ExportJobParameters,
    ExportJobRead,
    ExportJobType,
    ExportJobUpdate,
)
from app.core.data.dto.project import ProjectRead
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataReadResolved,
)
from app.core.data.dto.span_annotation import (
    SpanAnnotationRead,
    SpanAnnotationReadResolved,
)
from app.core.data.dto.span_group import SpanGroupRead
from app.core.data.dto.user import UserRead
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.bbox_annotation import BBoxAnnotationORM
from app.core.data.orm.code import CodeORM
from app.core.data.orm.document_tag import DocumentTagORM
from app.core.data.orm.memo import MemoORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
from app.core.data.repo.repo_service import RepoService
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta


class NoDataToExportError(Exception):
    def __init__(self, what_msg: str):
        super().__init__(what_msg)


class ExportJobPreparationError(Exception):
    def __init__(self, cause: Exception) -> None:
        super().__init__(f"Cannot prepare and create the ExportJob! {cause}")


class ExportJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, export_job_id: str) -> None:
        super().__init__(
            f"The ExportJob with ID {export_job_id} already started or is done!"
        )


class NoSuchExportJobError(Exception):
    def __init__(self, export_job_id: str, cause: Exception) -> None:
        super().__init__(f"There exists not ExportJob with ID {export_job_id}! {cause}")


class NoSuchExportFormatError(Exception):
    def __init__(self, export_format: str) -> None:
        super().__init__(
            (
                f"ExportFormat {export_format} not available! ",
                f"Available Formats: {[fmt.split('.')[0] for fmt in ExportFormat]}",
            )
        )


class UnsupportedExportJobTypeError(Exception):
    def __init__(self, export_job_type: ExportJobType) -> None:
        super().__init__(f"ExportJobType {export_job_type} is not supported! ")


class ExportService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.repo: RepoService = RepoService()
        cls.redis: RedisService = RedisService()
        cls.sqls: SQLService = SQLService()

        # map from job_type to function
        cls.export_method_for_job_type: Dict[ExportJobType, Callable[..., str]] = {
            ExportJobType.SINGLE_PROJECT_ALL_DATA: cls._export_all_data_from_proj,
            ExportJobType.SINGLE_PROJECT_ALL_TAGS: cls._export_all_tags_from_proj,
            ExportJobType.SINGLE_PROJECT_SELECTED_SDOCS: cls._export_selected_sdocs_from_proj,
            ExportJobType.SINGLE_USER_ALL_DATA: cls._export_user_data_from_proj,
            ExportJobType.SINGLE_USER_ALL_CODES: cls._export_user_codes_from_proj,
            ExportJobType.SINGLE_USER_ALL_MEMOS: cls._export_user_memos_from_proj,
            ExportJobType.SINGLE_USER_LOGBOOK: cls._export_user_logbook_from_proj,
            ExportJobType.SINGLE_DOC_ALL_USER_ANNOTATIONS: cls._export_all_user_annotations_from_sdoc,
            ExportJobType.SINGLE_DOC_SINGLE_USER_ANNOTATIONS: cls._export_user_annotations_from_sdoc,
        }

        return super(ExportService, cls).__new__(cls)

    def __create_export_zip(
        self, fn: Union[str, Path], exported_files: Sequence[Union[str, Path]]
    ) -> Path:
        fn = Path(fn)
        if not fn.suffix == ".zip":
            fn = fn.with_suffix(".zip")

        # Put file into random subdirectory
        random_prefix = Path(str(uuid4()))
        (self.repo.temp_files_root / random_prefix).mkdir()

        export_zip = self.repo.create_temp_file(Path(random_prefix / fn))
        with zipfile.ZipFile(export_zip, mode="w") as zipf:
            for file in map(Path, exported_files):
                zipf.write(file, file.name)
        logger.debug(f"Added {len(exported_files)} files to {export_zip}")
        return export_zip

    def __write_export_data_to_temp_file(
        self,
        data: pd.DataFrame,
        export_format: ExportFormat,
        fn: str,
    ) -> Path:
        temp_file = self.repo.create_temp_file(fn)
        temp_file = temp_file.replace(
            temp_file.with_suffix(f".{str(export_format.value).lower()}")
        )

        logger.info(f"Writing export data to {temp_file} !")
        if export_format == ExportFormat.CSV:
            data.to_csv(temp_file, sep=",", index=False, header=True)
        elif export_format == ExportFormat.JSON:
            data.to_json(temp_file, orient="records")

        return temp_file

    def __get_raw_sdocs_files_for_export(
        self,
        db: Session,
        sdoc_ids: Optional[List[int]] = None,
        sdocs: Optional[List[SourceDocumentRead]] = None,
    ) -> List[Path]:
        # TODO Flo: paging for too many docs
        if sdocs is None:
            if sdoc_ids is None:
                raise ValueError("Either IDs or DTOs must be not None")
            sdocs = [
                SourceDocumentRead.model_validate(sdoc)
                for sdoc in crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)
            ]

        sdoc_files = [
            self.repo.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True)
            for sdoc in sdocs
        ]
        return sdoc_files

    def __get_all_raw_sdocs_files_in_project_for_export(
        self, db: Session, project_id: int
    ) -> List[Path]:
        # TODO Flo: paging for too many docs
        sdocs = [
            SourceDocumentRead.model_validate(sdoc)
            for sdoc in crud_sdoc.read_by_project(db=db, proj_id=project_id)
        ]
        sdoc_files = self.__get_raw_sdocs_files_for_export(db=db, sdocs=sdocs)
        return sdoc_files

    def __generate_export_df_for_adoc(
        self,
        db: Session,
        adoc_id: Optional[int] = None,
        adoc: Optional[AnnotationDocumentORM] = None,
    ) -> pd.DataFrame:
        if adoc is None:
            if adoc_id is None:
                raise ValueError("Either ADoc ID or ORM must be not None")
            adoc = crud_adoc.read(db=db, id=adoc_id)

        logger.info(f"Exporting AnnotationDocument {adoc_id} ...")
        # get the adoc, proj, sdoc, user, and all annos
        user_dto = UserRead.model_validate(adoc.user)
        sdoc_dto = SourceDocumentRead.model_validate(adoc.source_document)
        proj_dto = ProjectRead.model_validate(
            crud_project.read(db=db, id=sdoc_dto.project_id)
        )

        # span annos
        spans = adoc.span_annotations
        span_read_dtos = [SpanAnnotationRead.model_validate(span) for span in spans]
        span_read_resolved_dtos = [
            SpanAnnotationReadResolved(
                **span_dto.model_dump(exclude={"current_code_id", "span_text_id"}),
                code=CodeRead.model_validate(span_orm.current_code.code),
                span_text=span_orm.span_text.text,
                user_id=span_orm.annotation_document.user_id,
                sdoc_id=span_orm.annotation_document.source_document_id,
            )
            for span_orm, span_dto in zip(spans, span_read_dtos)
        ]

        # bbox annos
        bboxes = adoc.bbox_annotations
        bbox_read_dtos = [BBoxAnnotationRead.model_validate(bbox) for bbox in bboxes]
        bbox_read_resolved_dtos = [
            BBoxAnnotationReadResolvedCode(
                **bbox_dto.model_dump(exclude={"current_code_id"}),
                code=CodeRead.model_validate(bbox_orm.current_code.code),
            )
            for bbox_orm, bbox_dto in zip(bboxes, bbox_read_dtos)
        ]

        # fill the DataFrame
        data = {
            "adoc_id": [],
            "proj_name": [],
            "project_id": [],
            "sdoc_name": [],
            "sdoc_id": [],
            "user_first_name": [],
            "user_last_name": [],
            "user_id": [],
            "code_name": [],
            "code_id": [],
            "created": [],
            "text": [],
            "text_begin_char": [],
            "text_end_char": [],
            "bbox_x_min": [],
            "bbox_x_max": [],
            "bbox_y_min": [],
            "bbox_y_max": [],
        }

        for span in span_read_resolved_dtos:
            data["proj_name"].append(proj_dto.title)
            data["project_id"].append(proj_dto.id)
            data["sdoc_name"].append(sdoc_dto.filename)
            data["sdoc_id"].append(sdoc_dto.id)
            data["adoc_id"].append(adoc_id)
            data["user_first_name"].append(user_dto.first_name)
            data["user_last_name"].append(user_dto.last_name)
            data["user_id"].append(user_dto.id)
            data["code_name"].append(span.code.name)
            data["code_id"].append(span.code.id)
            data["created"].append(span.created)
            data["text"].append(span.span_text)
            data["text_begin_char"].append(span.begin)
            data["text_end_char"].append(span.end)

            data["bbox_x_min"].append(None)
            data["bbox_x_max"].append(None)
            data["bbox_y_min"].append(None)
            data["bbox_y_max"].append(None)

        for bbox in bbox_read_resolved_dtos:
            data["proj_name"].append(proj_dto.title)
            data["project_id"].append(proj_dto.id)
            data["sdoc_name"].append(sdoc_dto.filename)
            data["sdoc_id"].append(sdoc_dto.id)
            data["adoc_id"].append(adoc_id)
            data["user_first_name"].append(user_dto.first_name)
            data["user_last_name"].append(user_dto.last_name)
            data["user_id"].append(user_dto.id)
            data["code_name"].append(bbox.code.name)
            data["code_id"].append(bbox.code.id)
            data["created"].append(bbox.created)
            data["bbox_x_min"].append(bbox.x_min)
            data["bbox_x_max"].append(bbox.x_max)
            data["bbox_y_min"].append(bbox.y_min)
            data["bbox_y_max"].append(bbox.y_max)

            data["text"].append(None)
            data["text_begin_char"].append(None)
            data["text_end_char"].append(None)

        df = pd.DataFrame(data=data)
        return df

    def __generate_export_df_for_memo(
        self,
        db: Session,
        memo_id: Optional[int] = None,
        memo: Optional[MemoORM] = None,
    ) -> pd.DataFrame:
        if memo is None:
            if memo_id is None:
                raise ValueError("Either Memo ID or ORM must be not None")
            memo = crud_memo.read(db=db, id=memo_id)

        logger.info(f"Exporting Memo {memo_id} ...")
        memo_dto = crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=memo)

        user_dto = UserRead.model_validate(memo.user)
        proj_dto = ProjectRead.model_validate(memo.project)

        # get attached object
        # avoid circular imports
        from app.core.data.crud.object_handle import crud_object_handle

        attached_to = crud_object_handle.resolve_handled_object(
            db=db, handle=memo.attached_to
        )

        # common data
        data = {
            "memo_id": [memo_id],
            "proj_name": [proj_dto.title],
            "project_id": [proj_dto.id],
            "user_first_name": [user_dto.first_name],
            "user_last_name": [user_dto.last_name],
            "user_id": [user_dto.id],
            "created": [memo_dto.created],
            "updated": [memo_dto.updated],
            "starred": [memo_dto.starred],
            "attached_to": [memo_dto.attached_object_type],
            "content": [memo_dto.content],
            "adoc_id": [None],
            "sdoc_name": [None],
            "sdoc_id": [None],
            "tag_name": [None],
            "tag_id": [None],
            "span_group_name": [None],
            "span_group_id": [None],
            "code_name": [None],
            "code_id": [None],
            "span_anno_id": [None],
            "span_anno_text": [None],
            "bbox_anno_id": [None],
        }

        if isinstance(attached_to, CodeORM):
            dto = CodeRead.model_validate(attached_to)
            data["code_name"] = [dto.name]
            data["code_id"] = [dto.id]

        elif isinstance(attached_to, SpanGroupORM):
            dto = SpanGroupRead.model_validate(attached_to)
            data["span_group_name"] = [dto.name]
            data["span_group_id"] = [dto.id]

        elif isinstance(attached_to, AnnotationDocumentORM):
            dto = AnnotationDocumentRead.model_validate(attached_to)
            sdoc_dto = SourceDocumentRead.model_validate(attached_to.source_document)
            data["sdoc_name"] = [sdoc_dto.filename]
            data["adoc_id"] = [dto.id]

        elif isinstance(attached_to, SourceDocumentORM):
            dto = SourceDocumentRead.model_validate(attached_to)
            data["sdoc_name"] = [dto.filename]
            data["sdoc_id"] = [dto.id]

        elif isinstance(attached_to, DocumentTagORM):
            dto = DocumentTagRead.model_validate(attached_to)
            data["tag_name"] = [dto.title]
            data["tag_id"] = [dto.id]

        elif isinstance(attached_to, SpanAnnotationORM):
            span_read_dto = SpanAnnotationRead.model_validate(attached_to)
            span_read_resolved_dto = SpanAnnotationReadResolved(
                **span_read_dto.model_dump(exclude={"current_code_id", "span_text_id"}),
                code=CodeRead.model_validate(attached_to.current_code.code),
                span_text=attached_to.span_text.text,
                user_id=attached_to.annotation_document.user_id,
                sdoc_id=attached_to.annotation_document.source_document_id,
            )

            data["span_anno_id"] = [span_read_dto.id]
            data["span_anno_text"] = [span_read_resolved_dto.span_text]
            data["code_id"] = [span_read_resolved_dto.code.id]
            data["code_name"] = [span_read_resolved_dto.code.name]

        elif isinstance(attached_to, BBoxAnnotationORM):
            bbox_read_dto = BBoxAnnotationRead.model_validate(attached_to)
            bbox_read_resolved_dto = BBoxAnnotationReadResolvedCode(
                **bbox_read_dto.model_dump(exclude={"current_code_id"}),
                code=CodeRead.model_validate(attached_to.current_code.code),
            )

            data["bbox_anno_id"] = [bbox_read_dto.id]
            data["code_id"] = [bbox_read_resolved_dto.code.id]
            data["code_name"] = [bbox_read_resolved_dto.code.name]

        elif isinstance(attached_to, ProjectORM):
            logger.warning("LogBook Export still todo!")
            pass

        df = pd.DataFrame(data=data)
        return df

    def __generate_export_df_for_sdoc_metadata(
        self,
        db: Session,
        metadata_id: Optional[int] = None,
        metadata_dto: Optional[SourceDocumentMetadataReadResolved] = None,
    ) -> pd.DataFrame:
        if metadata_dto is None:
            if metadata_id is None:
                raise ValueError("Either Metadata ID or DTO must be not None")
            metadata = crud_sdoc_meta.read(db=db, id=metadata_id)
            metadata_dto = SourceDocumentMetadataReadResolved.model_validate(metadata)

        logger.info(f"Exporting SourceDocumentMetadata {metadata_dto.id} ...")
        data = {
            "metadata_id": [metadata_dto.id],
            "applied_to_sdoc_id": [metadata_dto.source_document_id],
            "key": [metadata_dto.project_metadata.key],
            "value": [metadata_dto.get_value()],
        }

        df = pd.DataFrame(data=data)
        return df

    def __generate_export_dfs_for_all_sdoc_metadata_in_proj(
        self, db: Session, project_id: int
    ) -> List[pd.DataFrame]:
        metadata = crud_sdoc_meta.read_by_project(db=db, proj_id=project_id)
        metadata_dfs = []
        for md in metadata:
            metadata_dfs.append(
                self.__generate_export_df_for_sdoc_metadata(
                    db=db,
                    metadata_dto=SourceDocumentMetadataReadResolved.model_validate(md),
                )
            )

        return metadata_dfs

    def __generate_export_df_for_document_tags(
        self, db: Session, tag_id: int
    ) -> pd.DataFrame:
        logger.info(f"Exporting DocumentTag {tag_id} ...")

        tag = crud_document_tag.read(db=db, id=tag_id)
        tag_dto = DocumentTagRead.model_validate(tag)
        applied_to_sdoc_ids = [sdoc.id for sdoc in tag.source_documents]
        applied_to_sdoc_filenames = [sdoc.filename for sdoc in tag.source_documents]
        data = {
            "tag_id": [tag_dto.id],
            "tag_name": [tag_dto.title],
            "description": [tag_dto.description],
            "color": [tag_dto.color],
            "created": [tag_dto.created],
            "applied_to_sdoc_ids": [applied_to_sdoc_ids],
            "applied_to_sdoc_filenames": [applied_to_sdoc_filenames],
        }

        df = pd.DataFrame(data=data)
        return df

    def __generate_content_for_logbook_export(
        self, db: Session, project_id: int, user_id: int
    ) -> str:
        logger.info(f"Exporting LogBook for User {user_id} of Project {project_id} ...")
        # FIXME find better way to get the LogBook memo (with SQL but this will be a complicated query with JOINS to resolve the objecthandle)
        memos = crud_memo.read_by_user_and_project(
            db=db, user_id=user_id, proj_id=project_id, only_starred=False
        )
        logbook_dto = None
        # avoid circular imports
        from app.core.data.crud.object_handle import crud_object_handle

        for memo in memos:
            # get attached object
            attached_to = crud_object_handle.resolve_handled_object(
                db=db, handle=memo.attached_to
            )
            if isinstance(attached_to, ProjectORM):
                logbook_dto = crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=memo)

        if logbook_dto is None:
            msg = f"User {user_id} has no LogBook for Project {project_id}!"
            logger.warning(msg)
            return ""

        return logbook_dto.content

    def __generate_export_dfs_for_all_document_tags_in_project(
        self, db: Session, project_id: int
    ) -> List[pd.DataFrame]:
        tags = crud_project.read(db=db, id=project_id).document_tags
        exported_tags: List[pd.DataFrame] = []
        for tag in tags:
            export_data = self.__generate_export_df_for_document_tags(
                db=db, tag_id=tag.id
            )
            exported_tags.append(export_data)
        return exported_tags

    def __generate_export_df_for_code(self, db: Session, code_id: int) -> pd.DataFrame:
        logger.info(f"Exporting Code {code_id} ...")

        code = crud_code.read(db=db, id=code_id)
        user_dto = UserRead.model_validate(code.user)
        code_dto = CodeRead.model_validate(code)
        parent_code_id = code_dto.parent_code_id
        parent_code_name = None
        if parent_code_id is not None:
            parent_code_name = CodeRead.model_validate(code.parent_code).name

        data = {
            "code_id": [code_dto.id],
            "code_name": [code_dto.name],
            "description": [code_dto.description],
            "color": [code_dto.color],
            "created": [code_dto.created],
            "parent_code_id": [parent_code_id],
            "parent_code_name": [parent_code_name],
            "created_by_user_id": [user_dto.id],
            "created_by_user_first_name": [user_dto.first_name],
            "created_by_user_last_name": [user_dto.last_name],
        }

        df = pd.DataFrame(data=data)
        return df

    def __generate_export_dfs_for_user_data_in_project(
        self,
        db: Session,
        user_id: int,
        project_id: int,
    ) -> Tuple[List[pd.DataFrame], List[pd.DataFrame], List[pd.DataFrame]]:
        logger.info(f"Exporting data of User {user_id} in Project {project_id} ...")
        user = crud_user.read(db=db, id=user_id)

        # all AnnotationDocuments
        adocs = user.annotation_documents
        exported_adocs: List[pd.DataFrame] = []
        for adoc in adocs:
            if adoc.source_document.project_id == project_id:
                export_data = self.__generate_export_df_for_adoc(db=db, adoc_id=adoc.id)
                exported_adocs.append(export_data)

        # all Memos
        memos = user.memos
        exported_memos: List[pd.DataFrame] = []
        for memo in memos:
            if memo.project_id == project_id:
                export_data = self.__generate_export_df_for_memo(db=db, memo_id=memo.id)
                exported_memos.append(export_data)

        # all Codes
        codes = user.codes
        exported_codes: List[pd.DataFrame] = []
        for code in codes:
            if code.project_id == project_id:
                export_data = self.__generate_export_df_for_code(db=db, code_id=code.id)
                exported_codes.append(export_data)

        return exported_adocs, exported_memos, exported_codes

    def _export_user_annotations_from_sdoc(
        self,
        db: Session,
        user_id: int,
        sdoc_id: int,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        # get the adoc
        adoc = crud_adoc.read_by_sdoc_and_user(db=db, sdoc_id=sdoc_id, user_id=user_id)
        export_data = self.__generate_export_df_for_adoc(db=db, adoc=adoc)
        export_file = self.__write_export_data_to_temp_file(
            data=export_data,
            export_format=export_format,
            fn=f"project_{project_id}_sdoc_{sdoc_id}_adoc_{adoc.id}_export",
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def _export_all_user_annotations_from_sdoc(
        self,
        db: Session,
        sdoc_id: int,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        # get the adocs
        sdoc = crud_sdoc.read(db=db, id=sdoc_id)
        all_adocs = sdoc.annotation_documents
        if len(all_adocs) == 0:
            raise NoDataToExportError(
                f"There are no annotations for SDoc {sdoc_id} in Project {project_id}"
            )

        # export the data
        export_data = None
        for adoc in all_adocs:
            adoc_data = self.__generate_export_df_for_adoc(db=db, adoc=adoc)
            if export_data is None:
                export_data = adoc_data
            else:
                export_data = pd.concat((export_data, adoc_data))

        # write single file for all annos of that doc
        export_file = self.__write_export_data_to_temp_file(
            data=export_data,
            export_format=export_format,
            fn=f"sdoc_{sdoc_id}_annotations_export",
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def _export_multiple_adocs(
        self,
        db: Session,
        adoc_ids: List[int],
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        exported_files = []
        for adoc_id in adoc_ids:
            df = self.__generate_export_df_for_adoc(db=db, adoc_id=adoc_id)
            export_file = self.__write_export_data_to_temp_file(
                data=df,
                export_format=export_format,
                fn=f"adoc_{adoc_id}_export",
            )
            exported_files.append(export_file)

        # ZIP all files
        export_zip = self.__create_export_zip("adocs_export.zip", exported_files)
        return self.repo.get_temp_file_url(export_zip.name, relative=True)

    def _export_user_memos_from_proj(
        self,
        db: Session,
        user_id: int,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        # get the memo
        memos = crud_memo.read_by_user_and_project(
            db=db, user_id=user_id, proj_id=project_id, only_starred=False
        )
        if len(memos) == 0:
            raise NoDataToExportError(
                f"There are no memos for User {user_id} in Project {project_id}!"
            )

        export_data = None
        for memo in memos:
            memo_data = self.__generate_export_df_for_memo(
                db=db, memo_id=memo.id, memo=memo
            )
            if export_data is None:
                export_data = memo_data
            else:
                export_data = pd.concat((export_data, memo_data))

        export_file = self.__write_export_data_to_temp_file(
            data=export_data,
            export_format=export_format,
            fn=f"user_{user_id}_memos_export",
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def _export_project_codes(
        self,
        db: Session,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        proj = crud_project.read(db=db, id=project_id)
        code_dfs = [
            self.__generate_export_df_for_code(db=db, code_id=code.id)
            for code in proj.codes
        ]
        if len(code_dfs) > 0:
            codes = pd.concat(code_dfs)
            export_file = self.__write_export_data_to_temp_file(
                codes,
                export_format=export_format,
                fn=f"project_{project_id}_codes",
            )
            export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
            return export_url
        msg = f"No Codes to export in Project {project_id}"
        logger.error(msg)
        raise NoDataToExportError(msg)

    def _export_user_codes_from_proj(
        self,
        db: Session,
        user_id: int,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        user = crud_user.read(db=db, id=user_id)
        code_dfs = [
            self.__generate_export_df_for_code(db=db, code_id=code.id)
            for code in user.codes
            if code.project_id == project_id
        ]
        codes = pd.concat(code_dfs)
        export_file = self.__write_export_data_to_temp_file(
            codes, export_format=export_format, fn=f"user_{user_id}_codes"
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def _export_user_data_from_proj(
        self,
        db: Session,
        user_id: int,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        (
            exported_adocs,
            exported_memos,
            exported_codes,
        ) = self.__generate_export_dfs_for_user_data_in_project(
            db=db, user_id=user_id, project_id=project_id
        )

        exported_tags = self.__generate_export_dfs_for_all_document_tags_in_project(
            db=db, project_id=project_id
        )
        logbook_content = self.__generate_content_for_logbook_export(
            db=db, project_id=project_id, user_id=user_id
        )

        exported_files = []
        # one file per adoc
        for adoc_df in exported_adocs:
            if len(adoc_df) > 0:  # for adocs with 0 annos
                export_file = self.__write_export_data_to_temp_file(
                    data=adoc_df,
                    export_format=export_format,
                    fn=f"adoc_{adoc_df.iloc[0].adoc_id}_export",
                )
                exported_files.append(export_file)

        # one file for all memos
        if len(exported_memos) > 0:
            exported_memo_df = pd.concat(exported_memos)
            export_file = self.__write_export_data_to_temp_file(
                data=exported_memo_df,
                export_format=export_format,
                fn=f"user_{user_id}_memo_export",
            )
            exported_files.append(export_file)
        else:
            msg = f"No Memos to export for User {user_id} in Project {project_id}"
            logger.warning(msg)

        # one file for all codes
        if len(exported_codes) > 0:
            exported_code_df = pd.concat(exported_codes)
            export_file = self.__write_export_data_to_temp_file(
                data=exported_code_df,
                export_format=export_format,
                fn=f"user_{user_id}_code_export",
            )
            exported_files.append(export_file)
        else:
            msg = f"No Codes to export for User {user_id} in Project {project_id}"
            logger.warning(msg)

        # one file for all tags
        if len(exported_tags) > 0:
            exported_tag_df = pd.concat(exported_tags)
            export_file = self.__write_export_data_to_temp_file(
                data=exported_tag_df,
                export_format=export_format,
                fn=f"project_{project_id}_tags_export",
            )
            exported_files.append(export_file)
        else:
            msg = f"No Tags to export in Project {project_id}"
            logger.warning(msg)

        # one file for the logbook
        logbook_file = self.repo.create_temp_file(
            f"project_{project_id}_user_{user_id}_logbook.md"
        )
        logbook_file.write_text(logbook_content)

        # ZIP all files
        export_zip = self.__create_export_zip(
            f"project_{project_id}_user_{user_id}_export.zip", exported_files
        )

        return self.repo.get_temp_file_url(export_zip.name, relative=True)

    def _export_all_data_from_proj(
        self,
        db: Session,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        logger.info(f"Exporting all user data from Project {project_id} ...")
        proj = crud_project.read(db=db, id=project_id)
        users = proj.users

        exported_adocs: Dict[int, List[pd.DataFrame]] = dict()
        exported_memos: List[pd.DataFrame] = []
        exported_codes: List[pd.DataFrame] = []
        exported_logbooks: List[Tuple[int, str]] = []

        for user in users:
            (
                ex_adocs,
                ex_memos,
                ex_codes,
            ) = self.__generate_export_dfs_for_user_data_in_project(
                db=db, user_id=user.id, project_id=project_id
            )

            # one memo df per user
            if len(ex_memos) > 0:
                exported_memos.append(pd.concat(ex_memos))

            # one logbook content string per user
            exported_logbooks.append(
                (
                    user.id,
                    self.__generate_content_for_logbook_export(
                        db=db, project_id=project_id, user_id=user.id
                    ),
                )
            )

            # one code df per user
            if len(ex_codes) > 0:
                exported_codes.append(pd.concat(ex_codes))

            # group  the adocs by sdoc id and merge them later
            for adoc_df in ex_adocs:
                if len(adoc_df) > 0:  # for adocs with 0 annos:
                    sdoc_id = adoc_df.iloc[0].sdoc_id
                    if sdoc_id not in exported_adocs:
                        exported_adocs[sdoc_id] = []
                    exported_adocs[sdoc_id].append(adoc_df)

        # merge adocs
        merged_exported_adocs: List[pd.DataFrame] = []
        for adoc_id in exported_adocs.keys():
            merged_exported_adocs.append(pd.concat(exported_adocs[adoc_id]))

        # write adocs to files
        exported_files = []
        for adoc_df in merged_exported_adocs:
            export_file = self.__write_export_data_to_temp_file(
                data=adoc_df,
                export_format=export_format,
                fn=f"sdoc_{adoc_df.iloc[0].sdoc_id}_annotations_export",
            )
            exported_files.append(export_file)

        # write memos to files
        for memo_df in exported_memos:
            export_file = self.__write_export_data_to_temp_file(
                data=memo_df,
                export_format=export_format,
                fn=f"user_{memo_df.iloc[0].user_id}_memo_export",
            )
            exported_files.append(export_file)

        # write logbooks to files
        for user_id, logbook_content in exported_logbooks:
            logbook_file = self.repo.create_temp_file(f"user_{user_id}_logbook.md")
            logbook_file.write_text(logbook_content)
            exported_files.append(logbook_file)

        # write codes to files
        for code_df in exported_codes:
            export_file = self.__write_export_data_to_temp_file(
                data=code_df,
                export_format=export_format,
                fn=f"user_{code_df.iloc[0].created_by_user_id}_code_export",
            )
            exported_files.append(export_file)

        # write all tags to one file
        exported_tags = self.__generate_export_dfs_for_all_document_tags_in_project(
            db=db, project_id=project_id
        )
        if len(exported_tags) > 0:
            exported_tag_df = pd.concat(exported_tags)
            export_file = self.__write_export_data_to_temp_file(
                data=exported_tag_df,
                export_format=export_format,
                fn=f"project_{project_id}_tags_export",
            )
            exported_files.append(export_file)

        # write all sdoc metadata to one file
        exported_metadata = self.__generate_export_dfs_for_all_sdoc_metadata_in_proj(
            db=db, project_id=project_id
        )
        if len(exported_metadata) > 0:
            exported_metadata_df = pd.concat(exported_metadata)
            export_file = self.__write_export_data_to_temp_file(
                data=exported_metadata_df,
                export_format=export_format,
                fn=f"project_{project_id}_sdoc_metadata_export",
            )
            exported_files.append(export_file)

        # add all raw sdocs to export
        sdoc_files = self.__get_all_raw_sdocs_files_in_project_for_export(
            db=db, project_id=project_id
        )
        exported_files.extend(sdoc_files)

        # ZIP all files
        export_zip = self.__create_export_zip(
            f"user_data_project_{project_id}_export.zip", exported_files
        )

        return self.repo.get_temp_file_url(export_zip.name, relative=True)

    def _export_user_logbook_from_proj(
        self, db: Session, project_id: int, user_id: int
    ) -> str:
        # special handling for LogBook memos: we export is as single MarkDown File
        logbook_content = self.__generate_content_for_logbook_export(
            db=db, project_id=project_id, user_id=user_id
        )
        # create the logbook file
        logbook_file = self.repo.create_temp_file(
            f"project_{project_id}_user_{user_id}_logbook.md"
        )
        logbook_file.write_text(logbook_content)
        return self.repo.get_temp_file_url(logbook_file.name, relative=True)

    def _export_all_tags_from_proj(
        self,
        db: Session,
        project_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        ex_tags = self.__generate_export_dfs_for_all_document_tags_in_project(
            db=db, project_id=project_id
        )

        # one file for all tags
        if len(ex_tags) > 0:
            export_data = pd.concat(ex_tags)
            export_file = self.__write_export_data_to_temp_file(
                data=export_data,
                export_format=export_format,
                fn=f"project_{project_id}_tags",
            )
            export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
            return export_url
        msg = f"No DocumentTags to export in Project {project_id}"
        logger.error(msg)
        raise NoDataToExportError(msg)

    def _export_selected_sdocs_from_proj(
        self, db: Session, project_id: int, sdoc_ids: List[int]
    ) -> str:
        files = self.__get_raw_sdocs_files_for_export(db, sdoc_ids=sdoc_ids)
        zip = self.__create_export_zip(
            f"{len(files)}_exported_documents_project_{project_id}.zip", files
        )

        return self.repo.get_temp_file_url(zip.name, relative=True)

    def _assert_all_requested_data_exists(
        self, export_params: ExportJobParameters
    ) -> None:
        # TODO check all job type specific parameters
        if export_params.export_format.value not in set(i.value for i in ExportFormat):
            raise NoSuchExportFormatError(
                export_format=export_params.export_format.value
            )

        with self.sqls.db_session() as db:
            crud_project.exists(
                db=db,
                id=export_params.specific_export_job_parameters.project_id,
                raise_error=True,
            )

    def prepare_export_job(self, export_params: ExportJobParameters) -> ExportJobRead:
        self._assert_all_requested_data_exists(export_params=export_params)

        exj_create = ExportJobCreate(parameters=export_params)
        print(exj_create)
        try:
            exj_read = self.redis.store_export_job(export_job=exj_create)
        except Exception as e:
            raise ExportJobPreparationError(cause=e)

        return exj_read

    def get_export_job(self, export_job_id: str) -> ExportJobRead:
        try:
            exj = self.redis.load_export_job(key=export_job_id)
        except Exception as e:
            raise NoSuchExportJobError(export_job_id=export_job_id, cause=e)

        return exj

    def _update_export_job(
        self,
        export_job_id: str,
        status: Optional[BackgroundJobStatus] = None,
        url: Optional[str] = None,
    ) -> ExportJobRead:
        update = ExportJobUpdate(status=status, results_url=url)
        try:
            exj = self.redis.update_export_job(key=export_job_id, update=update)
        except Exception as e:
            raise NoSuchExportJobError(export_job_id=export_job_id, cause=e)
        return exj

    def start_export_job_sync(self, export_job_id: str) -> ExportJobRead:
        exj = self.get_export_job(export_job_id=export_job_id)
        if exj.status != BackgroundJobStatus.WAITING:
            raise ExportJobAlreadyStartedOrDoneError(export_job_id=export_job_id)

        exj = self._update_export_job(
            status=BackgroundJobStatus.RUNNING, export_job_id=export_job_id
        )

        # TODO: parse the parameters and run the respective method
        try:
            with self.sqls.db_session() as db:
                # get the export method based on the jobtype
                export_method = self.export_method_for_job_type.get(
                    exj.parameters.export_job_type, None
                )
                if export_method is None:
                    raise UnsupportedExportJobTypeError(exj.parameters.export_job_type)

                # execute the export_method with the provided specific parameters
                results_url = export_method(
                    self=self,
                    db=db,
                    **exj.parameters.specific_export_job_parameters.model_dump(
                        exclude={"export_job_type"}
                    ),
                )

            exj = self._update_export_job(
                url=results_url,
                status=BackgroundJobStatus.FINISHED,
                export_job_id=export_job_id,
            )

        except Exception as e:
            logger.error(f"Cannot finish export job: {e}")
            self._update_export_job(
                status=BackgroundJobStatus.ERROR,
                url=None,
                export_job_id=export_job_id,
            )

        return exj
