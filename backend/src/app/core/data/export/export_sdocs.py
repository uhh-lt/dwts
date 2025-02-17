from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.repo.repo_service import RepoService


def get_raw_sdocs_files_for_export(
    db: Session,
    repo: RepoService,
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
        repo.get_path_to_sdoc_file(sdoc, raise_if_not_exists=True) for sdoc in sdocs
    ]
    return sdoc_files


def get_all_raw_sdocs_files_in_project_for_export(
    db: Session,
    repo: RepoService,
    project_id: int,
) -> List[Path]:
    # TODO Flo: paging for too many docs
    sdocs = [
        SourceDocumentRead.model_validate(sdoc)
        for sdoc in crud_sdoc.read_by_project(db=db, proj_id=project_id)
    ]
    sdoc_files = get_raw_sdocs_files_for_export(db=db, repo=repo, sdocs=sdocs)
    return sdoc_files


def get_all_sdoc_transcripts_in_project_for_export(
    db: Session, project_id: int
) -> List[Tuple[str, List[Dict[str, Any]]]]:
    transcripts: List[Tuple[str, List[Dict[str, Any]]]] = []
    sdocs = [
        SourceDocumentRead.model_validate(sdoc)
        for sdoc in crud_sdoc.read_by_project(db=db, proj_id=project_id)
    ]
    sdoc_ids = [sdoc.id for sdoc in sdocs]
    if len(sdoc_ids) > 0:
        logger.info(f"Export sdoc datas transcript for {sdoc_ids}")
        sdoc_datas = crud_sdoc.read_data_batch(db=db, ids=sdoc_ids)
        for sdoc_data, sdoc in zip(sdoc_datas, sdocs):
            assert sdoc_data, (
                f"Expected sdoc data for id {sdoc.id} to exist, because sdocs exist."
            )
            wlt = sdoc_data.word_level_transcriptions
            if wlt is not None:
                logger.info(f"Exporting word_level_transcript of file {sdoc.filename}")
                transcripts.append((sdoc.filename, [x.model_dump() for x in wlt]))

    return transcripts
