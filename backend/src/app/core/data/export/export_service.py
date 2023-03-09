from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import zipfile

from loguru import logger
import pandas as pd
from sqlalchemy.orm import Session

from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.project import CRUDProject, crud_project
from app.core.data.crud.code import crud_code
from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.user import crud_user
from app.core.data.dto.annotation_document import AnnotationDocumentRead
from app.core.data.dto.bbox_annotation import (
    BBoxAnnotationRead,
    BBoxAnnotationReadResolvedCode,
)
from app.core.data.dto.code import CodeRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.project import ProjectRead
from app.core.data.dto.source_document import SourceDocumentRead
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
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_group import SpanGroupORM
from app.core.data.repo.repo_service import RepoService
from app.util.singleton_meta import SingletonMeta
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.core.data.dto.export_job import (
    ExportJobParameters,
    ExportJobRead,
    ExportJobCreate,
    ExportJobUpdate,
    ExportJobStatus,
    ExportFormat,
)


class NoDataToExportError(Exception):
    def __init__(self, what_msg: str):
        super().__init__(what_msg)


class ExportJobPreparationError(Exception):
    def __init__(self) -> None:
        super().__init__("Cannot prepare and create the ExportJob!")


class ExportJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, export_job_id: str) -> None:
        super().__init__(
            f"The ExportJob with ID {export_job_id} already started or is done!"
        )


class NoSuchExportJobError(Exception):
    def __init__(self, export_job_id: str) -> None:
        super().__init__(f"There exists not ExportJob with ID {export_job_id}")


class NoSuchExportFormatError(Exception):
    def __init__(self, export_format: str) -> None:
        super().__init__(
            (
                f"ExportFormat {export_format} not available! ",
                f"Available Formats: {[fmt.split('.')[0] for fmt in ExportFormat]}",
            )
        )


class ExportService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.repo: RepoService = RepoService()
        cls.redis: RedisService = RedisService()
        cls.sqls: SQLService = SQLService()

        return super(ExportService, cls).__new__(cls)

    def __create_export_zip(
        self, fn: Union[str, Path], file_paths: List[str | Path]
    ) -> Path:
        fn = Path(fn)
        if not fn.suffix == ".zip":
            fn = fn.with_suffix(".zip")
        export_zip = self.repo.create_temp_file(fn)
        with zipfile.ZipFile(export_zip, mode="w") as zipf:
            for file in exported_files:
                zipf.write(file, file.name)
        logger.debug(f"Added {len(file_paths)} files to {export_zip}")
        return export_zip

    def __write_export_data_to_temp_file(
        self, data: pd.DataFrame, export_format: ExportFormat, fn: Optional[str] = None
    ) -> Path:
        temp_file = self.repo.create_temp_file(fn=fn)
        temp_file = temp_file.replace(
            temp_file.with_suffix(f".{str(export_format.value).lower()}")
        )

        logger.info(f"Writing export data to {temp_file} !")
        if export_format == ExportFormat.CSV:
            data.to_csv(temp_file, sep=",", index=False, header=True)
        elif export_format == ExportFormat.JSON:
            data.to_json(temp_file, orient="records")

        return temp_file

    def __export_adoc_data(self, db: Session, adoc_id: int) -> pd.DataFrame:
        logger.info(f"Exporting AnnotationDocument {adoc_id} ...")
        # get the adoc, proj, sdoc, user, and all annos
        adoc = crud_adoc.read(db=db, id=adoc_id)
        user_dto = UserRead.from_orm(adoc.user)
        sdoc_dto = SourceDocumentRead.from_orm(adoc.source_document)
        proj_dto = ProjectRead.from_orm(
            crud_project.read(db=db, id=sdoc_dto.project_id)
        )

        # span annos
        spans = adoc.span_annotations
        span_read_dtos = [SpanAnnotationRead.from_orm(span) for span in spans]
        span_read_resolved_dtos = [
            SpanAnnotationReadResolved(
                **span_dto.dict(exclude={"current_code_id", "span_text_id"}),
                code=CodeRead.from_orm(span_orm.current_code.code),
                span_text=span_orm.span_text.text,
            )
            for span_orm, span_dto in zip(spans, span_read_dtos)
        ]

        # bbox annos
        bboxes = adoc.bbox_annotations
        bbox_read_dtos = [BBoxAnnotationRead.from_orm(bbox) for bbox in bboxes]
        bbox_read_resolved_dtos = [
            BBoxAnnotationReadResolvedCode(
                **bbox_dto.dict(exclude={"current_code_id"}),
                code=CodeRead.from_orm(bbox_orm.current_code.code),
            )
            for bbox_orm, bbox_dto in zip(bboxes, bbox_read_dtos)
        ]

        # fill the DataFrame
        data = {
            "adoc_id": [],
            "proj_name": [],
            "proj_id": [],
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
            data["proj_id"].append(proj_dto.id)
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
            data["proj_id"].append(proj_dto.id)
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

    def _export_adoc(
        self, db: Session, adoc_id: int, export_format: ExportFormat = ExportFormat.CSV
    ) -> str:
        export_data = self._export_adoc_data(db=db, adoc_id=adoc_id)
        export_file = self._write_export_data_to_temp_file(
            data=export_data, export_format=export_format, fn=f"adoc_{adoc_id}_export"
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def _export_adocs(
        self,
        db: Session,
        adoc_ids: List[int],
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        exported_files = []
        for adoc_id in adoc_ids:
            df = self._export_adoc_data(db=db, adoc_id=adoc_id)
            export_file = self._write_export_data_to_temp_file(
                data=df, export_format=export_format, fn=f"adoc_{adoc_id}_export"
            )
            exported_files.append(export_file)

        # ZIP all files
        export_zip = self.__create_export_zip("adocs_export.zip", exported_files)
        return self.repo.get_temp_file_url(export_zip.name, relative=True)

    def __export_memo_data(self, db: Session, memo_id: int) -> pd.DataFrame:
        logger.info(f"Exporting Memo {memo_id} ...")
        memo = crud_memo.read(db=db, id=memo_id)
        memo_dto = crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=memo)

        user_dto = UserRead.from_orm(memo.user)
        proj_dto = ProjectRead.from_orm(memo.project)

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
            "proj_id": [proj_dto.id],
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
            dto = CodeRead.from_orm(attached_to)
            data["code_name"] = [dto.name]
            data["code_id"] = [dto.id]

        elif isinstance(attached_to, SpanGroupORM):
            dto = SpanGroupRead.from_orm(attached_to)
            data["span_group_name"] = [dto.name]
            data["span_group_id"] = [dto.id]

        elif isinstance(attached_to, AnnotationDocumentORM):
            dto = AnnotationDocumentRead.from_orm(attached_to)
            sdoc_dto = SourceDocumentRead.from_orm(attached_to.source_document)
            data["sdoc_name"] = [sdoc_dto.filename]
            data["adoc_id"] = [dto.id]

        elif isinstance(attached_to, SourceDocumentORM):
            dto = SourceDocumentRead.from_orm(attached_to)
            data["sdoc_name"] = [dto.filename]
            data["sdoc_id"] = [dto.id]

        elif isinstance(attached_to, DocumentTagORM):
            dto = DocumentTagRead.from_orm(attached_to)
            data["tag_name"] = [dto.title]
            data["tag_id"] = [dto.id]

        elif isinstance(attached_to, SpanAnnotationORM):
            span_read_dto = SpanAnnotationRead.from_orm(attached_to)
            span_read_resolved_dto = SpanAnnotationReadResolved(
                **span_read_dto.dict(exclude={"current_code_id", "span_text_id"}),
                code=CodeRead.from_orm(attached_to.current_code.code),
                span_text=attached_to.span_text.text,
            )

            data["span_anno_id"] = [span_read_dto.id]
            data["span_anno_text"] = [span_read_resolved_dto.span_text]
            data["code_id"] = [span_read_resolved_dto.code.id]
            data["code_name"] = [span_read_resolved_dto.code.name]

        elif isinstance(attached_to, BBoxAnnotationORM):
            bbox_read_dto = BBoxAnnotationRead.from_orm(attached_to)
            bbox_read_resolved_dto = BBoxAnnotationReadResolvedCode(
                **bbox_read_dto.dict(exclude={"current_code_id"}),
                code=CodeRead.from_orm(attached_to.current_code.code),
            )

            data["bbox_anno_id"] = [bbox_read_dto.id]
            data["code_id"] = [bbox_read_resolved_dto.code.id]
            data["code_name"] = [bbox_read_resolved_dto.code.name]

        elif isinstance(attached_to, ProjectORM):
            logger.warning("LogBook Export still todo!")
            pass

        df = pd.DataFrame(data=data)
        return df

    def _export_memo(
        self, db: Session, memo_id: int, export_format: ExportFormat = ExportFormat.CSV
    ) -> str:
        export_data = self.__export_memo_data(db=db, memo_id=memo_id)
        export_file = self.__write_export_data_to_temp_file(
            data=export_data, export_format=export_format, fn=f"memo_{memo_id}_export"
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def __export_tag_data(self, db: Session, tag_id: int) -> pd.DataFrame:
        logger.info(f"Exporting DocumentTag {tag_id} ...")

        tag = crud_document_tag.read(db=db, id=tag_id)
        tag_dto = DocumentTagRead.from_orm(tag)
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

    def __export_logbook_memo_data(
        self, db: Session, proj_id: int, user_id: int
    ) -> str:
        logger.info(f"Exporting LogBook for User {user_id} of Project {proj_id} ...")
        # FIXME find better way to get the LogBook memo (with SQL but this will be a complicated query with JOINS to resolve the objecthandle)
        memos = crud_memo.read_by_user_and_project(
            db=db, user_id=user_id, proj_id=proj_id, only_starred=False
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
            msg = f"User {user_id} has no LogBook for Project {proj_id}!"
            logger.warning(msg)
            return ""

        return logbook_dto.content

    def _export_logbook_memo(self, db: Session, proj_id: int, user_id: int) -> str:
        # special handling for LogBook memos: we export is as single MarkDown File
        logbook_content = self.__export_logbook_memo_data(
            db=db, proj_id=proj_id, user_id=user_id
        )
        # create the logbook file
        logbook_file = self.repo.create_temp_file(
            f"project_{proj_id}_user_{user_id}_logbook.md"
        )
        logbook_file.write_text(logbook_content)
        return self.repo.get_temp_file_url(logbook_file.name, relative=True)

    def __export_project_tags_data(
        self, db: Session, proj_id: int
    ) -> List[pd.DataFrame]:
        tags = crud_project.read(db=db, id=proj_id).document_tags
        exported_tags: List[pd.DataFrame] = []
        for tag in tags:
            export_data = self.__export_tag_data(db=db, tag_id=tag.id)
            exported_tags.append(export_data)
        return exported_tags

    def _export_project_tags(
        self, db: Session, proj_id: int, export_format: ExportFormat = ExportFormat.CSV
    ) -> str:
        ex_tags = self.__export_project_tags_data(db=db, proj_id=proj_id)

        # one file for all tags
        if len(ex_tags) > 0:
            export_data = pd.concat(ex_tags)
            export_file = self.__write_export_data_to_temp_file(
                data=export_data,
                export_format=export_format,
                fn=f"project_{proj_id}_tags",
            )
            export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
            return export_url
        msg = f"No DocumentTags to export in Project {proj_id}"
        logger.error(msg)
        raise NoDataToExportError(msg)

    def __export_code_data(self, db: Session, code_id: int) -> pd.DataFrame:
        logger.info(f"Exporting Code {code_id} ...")

        code = crud_code.read(db=db, id=code_id)
        user_dto = UserRead.from_orm(code.user)
        code_dto = CodeRead.from_orm(code)
        parent_code_id = code_dto.parent_code_id
        parent_code_name = None
        if parent_code_id is not None:
            parent_code_name = CodeRead.from_orm(code.parent_code).name

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

    def _export_project_codes(
        self, db: Session, proj_id: int, export_format: ExportFormat = ExportFormat.CSV
    ) -> str:
        proj = crud_project.read(db=db, id=proj_id)
        code_dfs = [
            self.__export_code_data(db=db, code_id=code.id) for code in proj.codes
        ]
        if len(code_dfs) > 0:
            codes = pd.concat(code_dfs)
            export_file = self.__write_export_data_to_temp_file(
                codes, export_format=export_format, fn=f"project_{proj_id}_codes"
            )
            export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
            return export_url
        msg = f"No Codes to export in Project {proj_id}"
        logger.error(msg)
        raise NoDataToExportError(msg)

    def _export_user_codes_from_proj(
        self,
        db: Session,
        user_id: int,
        proj_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        user = crud_user.read(db=db, id=user_id)
        code_dfs = [
            self.__export_code_data(db=db, code_id=code.id)
            for code in user.codes
            if code.project_id == proj_id
        ]
        codes = pd.concat(code_dfs)
        export_file = self.__write_export_data_to_temp_file(
            codes, export_format=export_format, fn=f"user_{user_id}_codes"
        )
        export_url = self.repo.get_temp_file_url(export_file.name, relative=True)
        return export_url

    def __export_user_proj_data(
        self,
        db: Session,
        user_id: int,
        proj_id: int,
    ) -> Tuple[List[pd.DataFrame], List[pd.DataFrame], List[pd.DataFrame]]:
        logger.info(f"Exporting data of User {user_id} in Project {proj_id} ...")
        user = crud_user.read(db=db, id=user_id)

        # all AnnotationDocuments
        adocs = user.annotation_documents
        exported_adocs: List[pd.DataFrame] = []
        for adoc in adocs:
            if adoc.source_document.project_id == proj_id:
                export_data = self.__export_adoc_data(db=db, adoc_id=adoc.id)
                exported_adocs.append(export_data)

        # all Memos
        memos = user.memos
        exported_memos: List[pd.DataFrame] = []
        for memo in memos:
            if memo.project_id == proj_id:
                export_data = self.__export_memo_data(db=db, memo_id=memo.id)
                exported_memos.append(export_data)

        # all Codes
        codes = user.codes
        exported_codes: List[pd.DataFrame] = []
        for code in codes:
            if code.project_id == proj_id:
                export_data = self.__export_code_data(db=db, code_id=code.id)
                exported_codes.append(export_data)

        return exported_adocs, exported_memos, exported_codes

    def _export_user_data_from_proj(
        self,
        db: Session,
        user_id: int,
        proj_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:

        (
            exported_adocs,
            exported_memos,
            exported_codes,
        ) = self.__export_user_proj_data(db=db, user_id=user_id, proj_id=proj_id)

        exported_tags = self.__export_project_tags_data(db=db, proj_id=proj_id)
        logbook_content = self.__export_logbook_memo_data(
            db=db, proj_id=proj_id, user_id=user_id
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
            msg = f"No Memos to export for User {user_id} in Project {proj_id}"
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
            msg = f"No Codes to export for User {user_id} in Project {proj_id}"
            logger.warning(msg)

        # one file for all tags
        if len(exported_tags) > 0:
            exported_tag_df = pd.concat(exported_tags)
            export_file = self.__write_export_data_to_temp_file(
                data=exported_tag_df,
                export_format=export_format,
                fn=f"project_{proj_id}_tags_export",
            )
            exported_files.append(export_file)
        else:
            msg = f"No Tags to export in Project {proj_id}"
            logger.warning(msg)

        # one file for the logbook
        logbook_file = self.repo.create_temp_file(
            f"project_{proj_id}_user_{user_id}_logbook.md"
        )
        logbook_file.write_text(logbook_content)

        # ZIP all files
        export_zip = self.__create_export_zip(
            f"project_{proj_id}_user_{user_id}_export.zip", exported_files
        )

        return self.repo.get_temp_file_url(export_zip.name, relative=True)

    def _export_all_user_data_from_proj(
        self,
        db: Session,
        proj_id: int,
        export_format: ExportFormat = ExportFormat.CSV,
    ) -> str:
        logger.info(f"Exporting all user data from Project {proj_id} ...")
        proj = crud_project.read(db=db, id=proj_id)
        users = proj.users

        exported_adocs: Dict[int, List[pd.DataFrame]] = dict()
        exported_memos: List[pd.DataFrame] = []
        exported_codes: List[pd.DataFrame] = []
        exported_logbooks: List[Tuple[int, str]] = []

        for user in users:
            ex_adocs, ex_memos, ex_codes = self.__export_user_proj_data(
                db=db, user_id=user.id, proj_id=proj_id
            )

            # one memo df per user
            if len(ex_memos) > 0:
                exported_memos.append(pd.concat(ex_memos))

            # one logbook content string per user
            exported_logbooks.append(
                (
                    user.id,
                    self.__export_logbook_memo_data(
                        db=db, proj_id=proj_id, user_id=user.id
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
        exported_tags = self.__export_project_tags_data(db=db, proj_id=proj_id)
        if len(exported_tags) > 0:
            exported_tag_df = pd.concat(exported_tags)
            export_file = self.__write_export_data_to_temp_file(
                data=exported_tag_df,
                export_format=export_format,
                fn=f"project_{proj_id}_tags_export",
            )
            exported_files.append(export_file)

        # ZIP all files
        export_zip = self.__create_export_zip(
            f"user_data_project_{proj_id}_export.zip", exported_files
        )

        return self.repo.get_temp_file_url(export_zip.name, relative=True)

    def __assert_all_requested_data_exists(
        self, export_params: ExportJobParameters
    ) -> None:
        if export_params.export_format.value not in set(i.value for i in ExportFormat):
            raise NoSuchExportFormatError(
                export_format=export_params.export_format.value
            )

        with self.sqls.db_session() as db:
            crud_project.exists(db=db, id=export_params.project_id, raise_error=True)

    def prepare_export_job(self, export_params: ExportJobParameters) -> ExportJobRead:
        self.__assert_all_requested_data_exists(export_params=export_params)

        exj_create = ExportJobCreate(parameters=export_params)
        exj_read = self.redis.store_export_job(export_job=exj_create)
        if exj_read is None:
            raise ExportJobPreparationError()

        return exj_read

    def get_export_job(self, export_job_id: str) -> ExportJobRead:
        exj = self.redis.load_export_job(key=export_job_id)
        if exj is None:
            raise NoSuchExportJobError(export_job_id=export_job_id)

        return exj

    def _update_export_job(
        self,
        export_job_id: str,
        status: Optional[ExportJobStatus] = None,
        url: Optional[str] = None,
    ) -> ExportJobRead:
        update = ExportJobUpdate(status=status, results_url=url)
        exj = self.redis.update_export_job(key=export_job_id, update=update)
        if exj is None:
            raise NoSuchExportJobError(export_job_id=export_job_id)
        return exj

    def start_export_job_sync(self, export_job_id: str) -> ExportJobRead:
        exj = self.get_export_job(export_job_id=export_job_id)
        if exj.status != ExportJobStatus.INIT:
            raise ExportJobAlreadyStartedOrDoneError(export_job_id=export_job_id)

        exj = self._update_export_job(
            status=ExportJobStatus.IN_PROGRESS, export_job_id=export_job_id
        )

        # TODO: parse the parameters and run the respective method
        with self.sqls.db_session() as db:
            results_url = self._export_all_user_data_from_proj(
                db=db,
                export_format=exj.parameters.export_format,
                proj_id=exj.parameters.project_id,
            )
        exj = self._update_export_job(
            url=results_url,
            status=ExportJobStatus.DONE,
            export_job_id=export_job_id,
        )

        return exj
