import json
import re
from os import listdir
from os.path import isfile, join
from pathlib import Path
from typing import (
    Any,
    Dict,
    List,
    Optional,
    Set,
    Tuple,
)

import numpy as np
import pandas as pd
from celery import Task, group
from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.preprocessing_job import crud_prepro_job
from app.core.data.crud.project import crud_project
from app.core.data.doc_type import (
    DocType,
    get_doc_type,
    get_mime_type_from_file,
    mime_type_supported,
)
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.preprocessing_job import PreprocessingJobUpdate
from app.core.data.dto.preprocessing_job_payload import (
    PreprocessingJobPayloadCreateWithoutPreproJobId,
)
from app.core.data.dto.project import ProjectUpdate
from app.core.data.dto.source_document_data import WordLevelTranscription
from app.core.data.dto.source_document_link import SourceDocumentLinkCreate
from app.core.data.import_.import_codes import import_codes_to_proj
from app.core.data.import_.import_metadata import import_project_metadata
from app.core.data.import_.import_tags import import_tags_to_proj
from app.core.data.import_.import_users import import_users_to_proj
from app.core.data.orm.project import ProjectORM
from app.core.data.repo.repo_service import (
    RepoService,
)
from app.preprocessing.pipeline.model.image.autobbox import AutoBBox
from app.preprocessing.pipeline.model.text.autosentanno import AutoSentAnno
from app.preprocessing.pipeline.model.text.autospan import AutoSpan


class ImportSDocFileMissingException(Exception):
    def __init__(self, file_name: str, file_type: str):
        super().__init__(f"Cannot find {file_type} for {file_name} in import zip.")


class ImportFileMissingException(Exception):
    def __init__(self, file_type: str):
        super().__init__(f"Cannot find {file_type} in import zip.")


class ImportSDocFileUnsupportedMimeTypeException(Exception):
    def __init__(self, sdoc_name: str, mime_type: str) -> None:
        super().__init__(
            f"Expected sdoc file {sdoc_name} to be of mime types: {DocType}, but got {mime_type} instead."
        )


def update_project_details(
    db: Session,
    project_details: Dict[str, str],
    project_id: int,
) -> ProjectORM:
    assert "title" in project_details
    assert "description" in project_details
    title = project_details["title"]
    description = project_details["description"]
    assert title != ""
    if crud_project.exists_by_title(db=db, title=title):
        new_title = f"{title} (1)"
        counter = 1
        while crud_project.exists_by_title(db=db, title=new_title):
            counter += 1
            new_title = f"{title}({counter})"
    else:
        new_title = title
    project_update = ProjectUpdate(title=new_title, description=description)
    logger.info(f"updated project {project_update}")
    return crud_project.update(db=db, id=project_id, update_dto=project_update)


FILETYPE_REGEX = [
    (r"project_\d+_details.json", "project_details", True),
    (r"project_\d+_metadatas.csv", "project_metadatas", True),
    (r"project_\d+_codes.csv", "codes", True),
    (r"project_\d+_sdoc_links.csv", "sdoc_links", True),
    (r"project_\d+_tags.csv", "tags", True),
    (r"project_\d+_users.csv", "users", True),
    (r"user_\d+_logbook.md", "logbook", True),
    (r"user_\d+_memo.csv", "memo", True),
    (r"\w+.csv", "sdoc_annotations", False),
    (r"\w+.transcript.json", "sdoc_transcript", False),
    (r"\w+.metadata.json", "sdoc_metadatas", False),
]

REQUIRED_FILES_PER_SDOC = ["sdoc", "sdoc_annotations", "sdoc_metadatas"]


def __get_filetype_from_name(filename) -> Tuple[str, bool]:
    for regex in FILETYPE_REGEX:
        match = re.search(regex[0], filename)
        if match:
            return regex[1], regex[2]
    return "sdoc", False


def __read_import_project_files(temp_proj_path: Path) -> Tuple[Dict, Dict]:
    """
    expected_files = {
        "project_details": project_details.json
        "project_metadatas": project_metadatas.csv
        "codes": project_codes.csv
        "sdoc_links": project_sdoc_links.csv
        "tags": project_tags.csv
        "users": project_users.csv
    }
    sdoc_filepaths = {
        "sdoc_filename":{
            "sdoc": filename.html,
            "sdoc_metadatas": filename.metadata.json
            "sdoc_annotations": filename.csv
            "sdoc_transcript": filename.transcript.json
        }
    }
    """

    expected_files: Dict = dict()
    sdocs: Dict = dict()

    file_names = [f for f in listdir(temp_proj_path) if isfile(join(temp_proj_path, f))]
    for file_name in file_names:
        file_type, is_non_sdoc_filetype = __get_filetype_from_name(file_name)
        if file_type == "memo":
            # TODO: import memos not possible so far.
            pass

        elif file_type != "logbook":
            file_path = Path(join(temp_proj_path, file_name))
            if is_non_sdoc_filetype:
                # if its one of the "one of files"
                expected_files[file_type] = file_path
            else:
                sdoc_name = file_name.split(".")[
                    0
                ]  # This is brittle to filenames with dots in their names.
                if sdoc_name not in sdocs:
                    sdocs[sdoc_name] = dict()
                sdocs[sdoc_name][file_type] = file_path

    # post-conditions Everything is filled
    for file_type, file_value in expected_files.items():
        if not file_value:
            raise ImportFileMissingException(file_type)
        for sdoc_file_name, sdoc_data in sdocs.items():
            for sdoc_file_type in REQUIRED_FILES_PER_SDOC:
                if sdoc_file_type not in sdoc_data:
                    raise ImportSDocFileMissingException(sdoc_file_name, sdoc_file_type)

    return expected_files, sdocs


def import_project(
    db: Session,
    repo: RepoService,
    path_to_dir: Path,
    proj_id: int,
) -> None:
    try:
        expected_file_paths, sdoc_filepaths = __read_import_project_files(
            temp_proj_path=path_to_dir
        )
        logger.info(expected_file_paths)
        logger.info(sdoc_filepaths)

        # import project details
        with open(expected_file_paths["project_details"], "r") as f:
            project_details = json.load(f)
        update_project_details(
            db=db,
            project_details=project_details,
            project_id=proj_id,
        )

        # import project metadata
        metadata_mapping_df = pd.read_csv(expected_file_paths["project_metadatas"])
        for _, row in metadata_mapping_df.iterrows():
            import_project_metadata(row, db=db, proj_id=proj_id)

        # import users (link existing users to the new project)
        user_data_df = pd.read_csv(expected_file_paths["users"])
        user_email_id_mapping = import_users_to_proj(
            db=db,
            df=user_data_df,
            proj_id=proj_id,
        )

        # import codes
        codes_df = pd.read_csv(expected_file_paths["codes"])
        codes_df = codes_df.replace({np.nan: None})
        import_codes_to_proj(db=db, df=codes_df, project_id=proj_id)

        # import tags
        tags_df = pd.read_csv(expected_file_paths["tags"])
        tags_df = tags_df.replace({np.nan: None})
        tags_id_mapping = import_tags_to_proj(db=db, df=tags_df, proj_id=proj_id)

        # read sdoc links
        sdoc_links = pd.read_csv(expected_file_paths["sdoc_links"])
        logger.info("reading sdoc links")
        payloads: List[PreprocessingJobPayloadCreateWithoutPreproJobId] = []

        # all of following sdoc specific objects need to go into a dict that maps from filename to sdoc specific payloads.
        sdoc_specific_payloads: Dict[str, Dict[str, Any]] = dict()

        # 1 import sdoc annotations, tags, metadata and sdoc links and create payloads
        for sdoc_name, sdoc_package in sdoc_filepaths.items():
            sdoc_filepath = sdoc_package["sdoc"]
            assert isinstance(sdoc_filepath, Path)
            # move raw sdocs
            sdoc_filepath = repo.move_file_to_project_sdoc_files(proj_id, sdoc_filepath)
            logger.info(f"moving sdoc filepath {sdoc_filepath}")
            span_annos: Set[AutoSpan] = set()
            sent_annos: Set[AutoSentAnno] = set()
            bbox_annos: Set[AutoBBox] = set()
            tags: List[int] = []
            sdoc_link: List[SourceDocumentLinkCreate] = []
            # init the empty

            # get doc type from mime type
            mime_type = get_mime_type_from_file(sdoc_filepath)
            if not mime_type_supported(mime_type):
                raise ImportSDocFileUnsupportedMimeTypeException(sdoc_name, mime_type)
            sdoc_doctype = get_doc_type(mime_type)
            logger.info(f"Sdoc doctype {sdoc_doctype}")
            assert sdoc_doctype, "Expected Doctype to be not None."

            # create payloads with all sdocs
            payload = PreprocessingJobPayloadCreateWithoutPreproJobId(
                project_id=proj_id,
                filename=sdoc_filepath.name,
                mime_type=mime_type,
                doc_type=sdoc_doctype,
            )
            logger.info(f"Generate Payload dto {payload}")
            payloads.append(payload)

            # import sdoc metadata values
            sdoc_metadata_filepath = sdoc_package["sdoc_metadatas"]
            with open(sdoc_metadata_filepath, "r") as f:
                sdoc_metadata: Dict = json.load(f)
                metadata: Dict = {
                    metadata_key: metadata_attributes["value"]
                    for metadata_key, metadata_attributes in sdoc_metadata[
                        "metadata"
                    ].items()
                }
            logger.info(f"Generate sdoc metadata {metadata}")

            # import (optional) word level transcriptions
            sdoc_wlt: Optional[List[WordLevelTranscription]] = None
            if "sdoc_transcript" in sdoc_package:
                sdoc_transcript_filepath = sdoc_package["sdoc_transcript"]
                with open(sdoc_transcript_filepath, "r") as f:
                    sdoc_wlt = [
                        WordLevelTranscription.model_validate(x) for x in json.load(f)
                    ]

                logger.info(f"Generate word level transcription {sdoc_wlt}")

            # import sdoc tags
            for tag in sdoc_metadata["tags"]:
                tags.append(tags_id_mapping[tag])
            logger.info(f"Generate sdoc tags {tags}, {sdoc_name}")

            # import sdoc annotations
            sdoc_annotations_filepath = sdoc_package["sdoc_annotations"]
            sdoc_annotations_df = pd.read_csv(sdoc_annotations_filepath)
            logger.info(f"The doctype is {sdoc_doctype}")
            for _, row in sdoc_annotations_df.iterrows():
                # all annotations have user_email
                # all annotations have code_name
                if bool(pd.isna(row["user_email"])) or bool(pd.isna(row["code_name"])):
                    continue

                # user has to exist
                if row["user_email"] not in user_email_id_mapping:
                    continue

                user_id = user_email_id_mapping[str(row["user_email"])]

                # span annotations
                if (
                    bool(pd.notna(row["text"]))
                    and bool(pd.notna(row["text_begin_char"]))
                    and bool(pd.notna(row["text_end_char"]))
                    and bool(pd.notna(row["text_begin_token"]))
                    and bool(pd.notna(row["text_end_token"]))
                ):
                    auto = AutoSpan(
                        text=str(row["text"]),
                        start=int(row["text_begin_char"]),
                        end=int(row["text_end_char"]),
                        start_token=int(row["text_begin_token"]),
                        end_token=int(row["text_end_token"]),
                        user_id=user_id,
                        code=str(row["code_name"]),
                    )
                    span_annos.add(auto)

                # sentence annotations
                if bool(pd.notna(row["text_begin_sent"])) and bool(
                    pd.notna(row["text_end_sent"])
                ):
                    auto = AutoSentAnno(
                        start=int(row["text_begin_sent"]),
                        end=int(row["text_end_sent"]),
                        user_id=user_id,
                        code=str(row["code_name"]),
                    )
                    sent_annos.add(auto)

                # bbox annotations
                if (
                    bool(pd.notna(row["bbox_x_min"]))
                    and bool(pd.notna(row["bbox_y_min"]))
                    and bool(pd.notna(row["bbox_x_max"]))
                    and bool(pd.notna(row["bbox_y_max"]))
                ):
                    bbox = AutoBBox(
                        x_min=int(row["bbox_x_min"]),
                        y_min=int(row["bbox_y_min"]),
                        x_max=int(row["bbox_x_max"]),
                        y_max=int(row["bbox_y_max"]),
                        user_id=user_id,
                        code=str(row["code_name"]),
                    )
                    bbox_annos.add(bbox)

            logger.info(f"Generate sdoc span annotations {span_annos}")
            logger.info(f"Generate sdoc sentence annotations {sent_annos}")
            logger.info(f"Generate sdoc bbox annotations {bbox_annos}")

            # create sdoc link create dtos
            for linked_sdoc in sdoc_links[
                (sdoc_links["linked_source_document_filename"] == sdoc_filepath.name)
                | (sdoc_links["sdoc_filename"] == sdoc_filepath.name)
            ]["linked_source_document_filename"]:
                sdoc_link.append(
                    SourceDocumentLinkCreate(
                        linked_source_document_filename=linked_sdoc,
                        parent_source_document_id=None,
                    )
                )
            logger.info(f"Generate sdoc links {sdoc_link}")

            sdoc_specific_payloads[sdoc_filepath.name] = {
                "metadata": metadata,
                "annotations": span_annos,
                "sentence_annotations": sent_annos,
                "bboxes": bbox_annos,
                "tags": tags,
                "sdoc_link": sdoc_link,
            }
            if sdoc_wlt:
                sdoc_specific_payloads[sdoc_filepath.name][
                    "word_level_transcriptions"
                ] = sdoc_wlt

        # 2. Create preprojob
        from app.preprocessing.preprocessing_service import PreprocessingService

        pps: PreprocessingService = PreprocessingService()
        ppj = pps._create_and_store_preprocessing_job(proj_id, payloads)

        # 3. Create cargos
        cargos = pps._create_pipeline_cargos_from_preprocessing_job_with_data(
            ppj=ppj, sdoc_specific_payloads=sdoc_specific_payloads
        )

        # 4. init import piplines
        from app.celery.background_jobs.tasks import (
            execute_audio_preprocessing_pipeline_task,
            execute_image_preprocessing_pipeline_task,
            execute_text_preprocessing_pipeline_task,
            execute_video_preprocessing_pipeline_task,
        )

        assert isinstance(execute_text_preprocessing_pipeline_task, Task), (
            "Not a Celery Task"
        )

        tasks = [
            execute_text_preprocessing_pipeline_task.s(cargo, is_init=False)
            for cargo in cargos[DocType.text]
        ]

        # 5. init image pipelines
        assert isinstance(execute_image_preprocessing_pipeline_task, Task), (
            "Not a Celery Task"
        )
        image_tasks = [
            execute_image_preprocessing_pipeline_task.s(cargo, is_init=False)
            for cargo in cargos[DocType.image]
        ]
        tasks.extend(image_tasks)

        # 6. init audio pipelines
        assert isinstance(execute_audio_preprocessing_pipeline_task, Task), (
            "Not a Celery Task"
        )
        audio_tasks = [
            execute_audio_preprocessing_pipeline_task.s(cargo, is_init=False)
            for cargo in cargos[DocType.audio]
        ]
        tasks.extend(audio_tasks)

        # 7. init video pipelines
        assert isinstance(execute_video_preprocessing_pipeline_task, Task), (
            "Not a Celery Task"
        )
        video_tasks = [
            execute_video_preprocessing_pipeline_task.s(cargo, is_init=False)
            for cargo in cargos[DocType.video]
        ]
        tasks.extend(video_tasks)

        crud_prepro_job.update(
            db=db,
            uuid=ppj.id,
            update_dto=PreprocessingJobUpdate(status=BackgroundJobStatus.RUNNING),
        )
        logger.info(f"Starting {len(tasks)} tasks on ppj {ppj.id}")
        gr = group(*tasks)()
        logger.info(f"-------------{gr}")

    except Exception as e:
        crud_project.remove(db=db, id=proj_id)
        raise e
