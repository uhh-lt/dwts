from typing import Dict, List

from fastapi import APIRouter, Depends
from loguru import logger
from sqlalchemy.orm import Session

from api.dependencies import (
    get_current_user,
    get_db_session,
    skip_limit_params,
)
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.bbox_annotation import crud_bbox_anno
from app.core.data.crud.sentence_annotation import crud_sentence_anno
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.crud.span_group import crud_span_group
from app.core.data.dto.bbox_annotation import (
    BBoxAnnotationRead,
)
from app.core.data.dto.sentence_annotation import (
    SentenceAnnotationRead,
    SentenceAnnotatorResult,
)
from app.core.data.dto.source_document import (
    SourceDocumentRead,
    SourceDocumentUpdate,
)
from app.core.data.dto.source_document_data import SourceDocumentDataRead
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataRead,
)
from app.core.data.dto.span_annotation import (
    SpanAnnotationRead,
)
from app.core.data.dto.span_group import SpanGroupRead
from app.core.data.dto.word_frequency import WordFrequencyRead
from app.core.data.repo.repo_service import RepoService

router = APIRouter(
    prefix="/sdoc", dependencies=[Depends(get_current_user)], tags=["sourceDocument"]
)


@router.get(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Returns the SourceDocument with the given ID if it exists",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_if_finished: bool = True,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    if not only_if_finished:
        crud_sdoc.get_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)

    return SourceDocumentRead.model_validate(crud_sdoc.read(db=db, id=sdoc_id))


@router.get(
    "/data/{sdoc_id}",
    response_model=SourceDocumentDataRead,
    summary="Returns the SourceDocumentData with the given ID if it exists",
)
def get_by_id_with_data(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_if_finished: bool = True,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentDataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    if not only_if_finished:
        crud_sdoc.get_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)

    sdoc_data = crud_sdoc.read_data(db=db, id=sdoc_id)
    return SourceDocumentDataRead.model_validate(sdoc_data)


@router.delete(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Removes the SourceDocument with the given ID if it exists",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_obj = crud_sdoc.remove(db=db, id=sdoc_id)
    return SourceDocumentRead.model_validate(db_obj)


@router.patch(
    "/{sdoc_id}",
    response_model=SourceDocumentRead,
    summary="Updates the SourceDocument with the given ID.",
)
def update_sdoc(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    sdoc: SourceDocumentUpdate,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    db_obj = crud_sdoc.update(db=db, id=sdoc_id, update_dto=sdoc)
    return SourceDocumentRead.model_validate(db_obj)


@router.get(
    "/{sdoc_id}/linked_sdocs",
    response_model=List[int],
    summary="Returns the ids of SourceDocuments linked to the SourceDocument with the given id.",
)
def get_linked_sdocs(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    return crud_sdoc.collect_linked_sdoc_ids(db=db, sdoc_id=sdoc_id)


@router.get(
    "/{sdoc_id}/url",
    response_model=str,
    summary="Returns the URL to the original file of the SourceDocument with the given ID if it exists.",
)
def get_file_url(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    relative: bool = True,
    webp: bool = False,
    thumbnail: bool = False,
    authz_user: AuthzUser = Depends(),
) -> str:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    # TODO: FIX TYPING
    return RepoService().get_sdoc_url(
        sdoc=SourceDocumentRead.model_validate(sdoc_db_obj),
        relative=relative,
        webp=webp,
        thumbnail=thumbnail,
    )


@router.get(
    "/{sdoc_id}/metadata",
    response_model=List[SourceDocumentMetadataRead],
    summary="Returns all SourceDocumentMetadata of the SourceDocument with the given ID if it exists",
)
def get_all_metadata(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[SourceDocumentMetadataRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return [
        SourceDocumentMetadataRead.model_validate(meta)
        for meta in sdoc_db_obj.metadata_
    ]


@router.get(
    "/{sdoc_id}/metadata/{metadata_key}",
    response_model=SourceDocumentMetadataRead,
    summary="Returns the SourceDocumentMetadata with the given Key if it exists.",
)
def read_metadata_by_key(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    metadata_key: str,
    authz_user: AuthzUser = Depends(),
) -> SourceDocumentMetadataRead:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    metadata_db_obj = crud_sdoc_meta.read_by_sdoc_and_key(
        db=db, sdoc_id=sdoc_id, key=metadata_key
    )
    return SourceDocumentMetadataRead.model_validate(metadata_db_obj)


@router.get(
    "/{sdoc_id}/annotators",
    response_model=List[int],
    summary="Returns IDs of users that annotated that SourceDocument.",
)
def get_annotators(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    return [
        adoc.user_id for adoc in crud_sdoc.read(db=db, id=sdoc_id).annotation_documents
    ]


@router.get(
    "/{sdoc_id}/tags",
    response_model=List[int],
    summary="Returns all DocumentTagIDs linked with the SourceDocument.",
)
def get_all_tags(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[int]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return [doc_tag_db_obj.id for doc_tag_db_obj in sdoc_db_obj.document_tags]


@router.get(
    "/{sdoc_id}/word_frequencies",
    response_model=List[WordFrequencyRead],
    summary="Returns the SourceDocument's word frequencies with the given ID if it exists",
)
def get_word_frequencies(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[WordFrequencyRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    sdoc = crud_sdoc.read(db=db, id=sdoc_id)
    return [WordFrequencyRead.model_validate(wf) for wf in sdoc.word_frequencies]


@router.get(
    "/{sdoc_id}/span_annotations/{user_id}}",
    response_model=List[SpanAnnotationRead],
    summary="Returns all SpanAnnotations of the Users with the given ID if it exists",
)
def get_all_span_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    user_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[SpanAnnotationRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    spans = crud_span_anno.read_by_user_and_sdoc(
        db=db, user_id=user_id, sdoc_id=sdoc_id
    )
    return [SpanAnnotationRead.model_validate(span) for span in spans]


@router.get(
    "/{sdoc_id}/bbox_annotations/{user_id}",
    response_model=List[BBoxAnnotationRead],
    summary="Returns all BBoxAnnotations of the Users with the given ID if it exists",
)
def get_all_bbox_annotations_bulk(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    user_id: int,
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
    authz_user: AuthzUser = Depends(),
) -> List[BBoxAnnotationRead]:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    bboxes = crud_bbox_anno.read_by_user_and_sdoc(
        db=db, user_id=user_id, sdoc_id=sdoc_id, **skip_limit
    )
    return [BBoxAnnotationRead.model_validate(bbox) for bbox in bboxes]


@router.get(
    "/{sdoc_id}/sentence_annotator",
    response_model=SentenceAnnotatorResult,
    summary="Returns all SentenceAnnotations of the User for the SourceDocument",
)
def get_sentence_annotator(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    user_id: int,
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
    authz_user: AuthzUser = Depends(),
) -> SentenceAnnotatorResult:
    authz_user.assert_in_same_project_as(Crud.SOURCE_DOCUMENT, sdoc_id)

    # read sentences
    sdoc_data = crud_sdoc.read_data(db=db, id=sdoc_id)
    if sdoc_data is None:
        raise ValueError("SourceDocument is not a text document")

    # read sentence annotations
    sentence_annos = [
        SentenceAnnotationRead.model_validate(sent_anno)
        for sent_anno in crud_sentence_anno.read_by_users_and_sdoc(
            db=db, user_ids=[user_id], sdoc_id=sdoc_id, **skip_limit
        )
    ]

    # build result object: sentence_id -> [sentence_annotations]
    result: Dict[int, List[SentenceAnnotationRead]] = {
        idx: [] for idx in range(len(sdoc_data.sentences))
    }
    for sent_anno in sentence_annos:
        for sent_idx in range(
            sent_anno.sentence_id_start, sent_anno.sentence_id_end + 1
        ):
            if sent_idx >= len(result):
                logger.warning(f"Invalid sentence index {sent_idx} for sdoc {sdoc_id}")
                continue
            result[sent_idx].append(sent_anno)

    return SentenceAnnotatorResult(
        sentence_annotations=result,
    )


@router.get(
    "/{sdoc_id}/user/span_groups",
    response_model=List[SpanGroupRead],
    summary="Returns all SpanGroups of the logged-in User if it exists",
)
def get_all_span_groups(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
    authz_user: AuthzUser = Depends(),
) -> List[SpanGroupRead]:
    return [
        SpanGroupRead.model_validate(group)
        for group in crud_span_group.read_by_user_and_sdoc(
            db=db, user_id=authz_user.user.id, sdoc_id=sdoc_id, **skip_limit
        )
    ]
