from typing import List, Optional

from api.dependencies import get_current_user, get_db_session
from api.util import get_object_memos
from app.core.data.crud.annotation_document import crud_adoc
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.annotation_document import AnnotationDocumentRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.memo import AttachedObjectType, MemoCreate, MemoInDB, MemoRead
from app.core.data.dto.source_document import (
    SourceDocumentContent,
    SourceDocumentHTML,
    SourceDocumentKeywords,
    SourceDocumentRead,
    SourceDocumentSentences,
    SourceDocumentTokens,
)
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataRead,
    SourceDocumentMetadataUpdate,
)
from app.core.data.repo.repo_service import RepoService
from app.core.search.elasticsearch_service import ElasticSearchService
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/sdoc", dependencies=[Depends(get_current_user)])
tags = ["sourceDocument"]


@router.get(
    "/{sdoc_id}",
    tags=tags,
    response_model=Optional[SourceDocumentRead],
    summary="Returns the SourceDocument",
    description="Returns the SourceDocument with the given ID if it exists",
)
async def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_if_finished: bool = True,
) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    if not only_if_finished:
        crud_sdoc.get_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)

    db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return SourceDocumentRead.from_orm(db_obj)


@router.delete(
    "/{sdoc_id}",
    tags=tags,
    response_model=Optional[SourceDocumentRead],
    summary="Removes the SourceDocument",
    description="Removes the SourceDocument with the given ID if it exists",
)
async def delete_by_id(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_sdoc.remove(db=db, id=sdoc_id)
    return SourceDocumentRead.from_orm(db_obj)


@router.get(
    "/{sdoc_id}/content",
    tags=tags,
    response_model=Optional[SourceDocumentContent],
    summary="Returns the (textual) content of the SourceDocument",
    description=(
        "Returns the (textual) content of the SourceDocument if it exists. If the SourceDocument is "
        "not a text file, there is no content but an URL to the file content."
    ),
)
async def get_content(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_finished: Optional[bool] = True,
) -> Optional[SourceDocumentContent]:
    # TODO Flo: only if the user has access?
    if only_finished:
        crud_sdoc.get_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)

    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    if sdoc_db_obj.doctype == DocType.text:
        return ElasticSearchService().get_sdoc_content_by_sdoc_id(
            sdoc_id=sdoc_db_obj.id, proj_id=sdoc_db_obj.project_id
        )
    url = RepoService().get_sdoc_url(sdoc=SourceDocumentRead.from_orm(sdoc_db_obj))
    return SourceDocumentContent(source_document_id=sdoc_id, content=url)


@router.get(
    "/{sdoc_id}/html",
    tags=tags,
    response_model=Optional[SourceDocumentHTML],
    summary="Returns the (html) content of the SourceDocument",
    description=(
        "Returns the (html) content of the SourceDocument if it exists. If the SourceDocument is "
        "not a text file, there is no content but an URL to the file content."
    ),
)
async def get_html(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_finished: Optional[bool] = True,
) -> Optional[SourceDocumentHTML]:
    # TODO Flo: only if the user has access?
    if only_finished:
        crud_sdoc.get_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)

    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    if sdoc_db_obj.doctype == DocType.text:
        return ElasticSearchService().get_sdoc_html_by_sdoc_id(
            sdoc_id=sdoc_db_obj.id, proj_id=sdoc_db_obj.project_id
        )
    return RepoService().get_sdoc_url(sdoc=SourceDocumentRead.from_orm(sdoc_db_obj))


@router.get(
    "/{sdoc_id}/tokens",
    tags=tags,
    response_model=Optional[SourceDocumentTokens],
    summary="Returns the textual tokens of the SourceDocument if it is a text document.",
    description="Returns the textual tokens of the SourceDocument if it is a text document.",
)
async def get_tokens(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_finished: Optional[bool] = True,
    character_offsets: Optional[bool] = Query(
        title="Include Character Offsets",
        description="If True include the character offsets.",
        default=False,
    ),
) -> Optional[SourceDocumentTokens]:
    if only_finished:
        crud_sdoc.get_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return ElasticSearchService().get_sdoc_tokens_by_sdoc_id(
        sdoc_id=sdoc_db_obj.id,
        proj_id=sdoc_db_obj.project_id,
        character_offsets=character_offsets,
    )


@router.get(
    "/{sdoc_id}/sentences",
    tags=tags,
    response_model=Optional[SourceDocumentSentences],
    summary="Returns the sentences of the SourceDocument if it is a text document.",
    description="Returns the sentences of the SourceDocument if it is a text document.",
)
async def get_sentences(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_finished: Optional[bool] = True,
    sentence_offsets: Optional[bool] = Query(
        title="Include Sentence Offsets",
        description="If True include the character offsets.",
        default=False,
    ),
) -> Optional[SourceDocumentSentences]:
    if only_finished:
        crud_sdoc.get_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return ElasticSearchService().get_sdoc_sentences_by_sdoc_id(
        sdoc_id=sdoc_db_obj.id,
        proj_id=sdoc_db_obj.project_id,
        sentence_offsets=sentence_offsets,
    )


@router.get(
    "/{sdoc_id}/keywords",
    tags=tags,
    response_model=Optional[SourceDocumentKeywords],
    summary="Returns the keywords of the SourceDocument if it is a text document.",
    description="Returns the keywords of the SourceDocument if it is a text document.",
)
async def get_keywords(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    only_finished: Optional[bool] = True,
) -> Optional[SourceDocumentKeywords]:
    # TODO Flo: only if the user has access?
    if only_finished:
        crud_sdoc.get_status(db=db, sdoc_id=sdoc_id, raise_error_on_unfinished=True)
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)

    # if the sdoc is audio or video we return the keywords of the transcript
    if sdoc_db_obj.doctype == DocType.audio or sdoc_db_obj.doctype == DocType.video:
        # FIXME a video sdoc has one linked sdoc and a audi has two.
        #   the last is always the transcrip sdoc id.
        #   but this is very hack and error prone.
        linked_sdocs = crud_sdoc.collect_linked_sdoc_ids(db=db, sdoc_id=sdoc_id)
        if len(linked_sdocs) == 1 and len(linked_sdocs) != 2:
            # we have to follow the link from the audio sdoc to the transcript sdoc
            linked_sdocs = crud_sdoc.collect_linked_sdoc_ids(
                db=db,
                sdoc_id=linked_sdocs[0],
            )
        elif len(linked_sdocs) == 2:
            raise ValueError(f"Cannot find transcript for SourceDocument {sdoc_id}")
        sdoc_id = linked_sdocs[-1]

    return ElasticSearchService().get_sdoc_keywords_by_sdoc_id(
        sdoc_id=sdoc_id, proj_id=sdoc_db_obj.project_id
    )


@router.get(
    "/{sdoc_id}/linked_sdocs",
    tags=tags,
    response_model=List[int],
    summary="Returns the ids of SourceDocuments linked to the SourceDocument with the given id.",
    description="Returns the ids of SourceDocuments linked to the SourceDocument with the given id.",
)
async def get_linked_sdocs(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> List[int]:
    return crud_sdoc.collect_linked_sdoc_ids(db=db, sdoc_id=sdoc_id)


@router.patch(
    "/{sdoc_id}/keywords",
    tags=tags,
    response_model=Optional[SourceDocumentKeywords],
    summary="Updates the keywords of the SourceDocument.",
    description="Updates the keywords of the SourceDocument.",
)
async def update_keywords(
    *, db: Session = Depends(get_db_session), keywords: SourceDocumentKeywords
) -> Optional[SourceDocumentKeywords]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=keywords.source_document_id)
    return ElasticSearchService().update_esdoc_keywords(
        keywords=keywords, proj_id=sdoc_db_obj.project_id
    )


@router.get(
    "/{sdoc_id}/url",
    tags=tags,
    response_model=Optional[str],
    summary="Returns the URL to the original file of the SourceDocument",
    description="Returns the URL to the original file of the SourceDocument with the given ID if it exists.",
)
async def get_file_url(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    relative: Optional[bool] = True,
    webp: Optional[bool] = False,
    thumbnail: Optional[bool] = False,
) -> Optional[str]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return RepoService().get_sdoc_url(
        sdoc=SourceDocumentRead.from_orm(sdoc_db_obj),
        relative=relative,
        webp=webp,
        thumbnail=thumbnail,
    )


@router.get(
    "/{sdoc_id}/metadata",
    tags=tags,
    response_model=List[SourceDocumentMetadataRead],
    summary="Returns all SourceDocumentMetadata",
    description="Returns all SourceDocumentMetadata of the SourceDocument with the given ID if it exists",
)
async def get_all_metadata(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    exclude_csv: Optional[str] = "word_level_transcriptions,word_frequencies",
) -> List[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    metadata = [
        SourceDocumentMetadataRead.from_orm(meta) for meta in sdoc_db_obj.metadata_
    ]
    if exclude_csv is not None:
        exclude = exclude_csv.split(",")
        metadata = [meta for meta in metadata if meta.key not in exclude]
    return metadata


@router.get(
    "/{sdoc_id}/metadata/{metadata_key}",
    tags=tags,
    response_model=Optional[SourceDocumentMetadataRead],
    summary="Returns the SourceDocumentMetadata with the given Key",
    description="Returns the SourceDocumentMetadata with the given Key if it exists.",
)
async def read_metadata_by_key(
    *, db: Session = Depends(get_db_session), sdoc_id: int, metadata_key: str
) -> Optional[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    crud_sdoc.exists(db=db, id=sdoc_id, raise_error=True)
    metadata_db_obj = crud_sdoc_meta.read_by_sdoc_and_key(
        db=db, sdoc_id=sdoc_id, key=metadata_key
    )
    return SourceDocumentMetadataRead.from_orm(metadata_db_obj)


@router.patch(
    "/{sdoc_id}/metadata/{metadata_id}",
    tags=tags,
    response_model=Optional[SourceDocumentMetadataRead],
    summary="Updates the SourceDocumentMetadata",
    description="Updates the SourceDocumentMetadata with the given ID if it exists.",
)
async def update_metadata_by_id(
    *,
    db: Session = Depends(get_db_session),
    sdoc_id: int,
    metadata_id: int,
    metadata: SourceDocumentMetadataUpdate,
) -> Optional[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    crud_sdoc.exists(db=db, id=sdoc_id, raise_error=True)
    metadata_db_obj = crud_sdoc_meta.update(
        db=db, metadata_id=metadata_id, update_dto=metadata
    )
    return SourceDocumentMetadataRead.from_orm(metadata_db_obj)


@router.get(
    "/{sdoc_id}/adoc/{user_id}",
    tags=tags,
    response_model=Optional[AnnotationDocumentRead],
    summary="Returns the AnnotationDocument for the SourceDocument of the User",
    description="Returns the AnnotationDocument for the SourceDocument of the User.",
)
async def get_adoc_of_user(
    *, db: Session = Depends(get_db_session), sdoc_id: int, user_id: int
) -> Optional[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    return AnnotationDocumentRead.from_orm(
        crud_adoc.read_by_sdoc_and_user(db=db, sdoc_id=sdoc_id, user_id=user_id)
    )


@router.get(
    "/{sdoc_id}/adoc",
    tags=tags,
    response_model=List[AnnotationDocumentRead],
    summary="Returns all AnnotationDocuments for the SourceDocument",
    description="Returns all AnnotationDocuments for the SourceDocument.",
)
async def get_all_adocs(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> List[AnnotationDocumentRead]:
    # TODO Flo: only if the user has access?
    return [
        AnnotationDocumentRead.from_orm(adoc)
        for adoc in crud_sdoc.read(db=db, id=sdoc_id).annotation_documents
    ]


@router.delete(
    "/{sdoc_id}/adoc",
    tags=tags,
    response_model=List[int],
    summary="Removes all AnnotationDocuments for the SourceDocument",
    description="Removes all AnnotationDocuments for the SourceDocument.",
)
async def remove_all_adocs(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> List[int]:
    # TODO Flo: only if the user has access?
    return crud_adoc.remove_by_sdoc(db=db, sdoc_id=sdoc_id)


@router.get(
    "/{sdoc_id}/tags",
    tags=tags,
    response_model=List[DocumentTagRead],
    summary="Returns all DocumentTags linked with the SourceDocument",
    description="Returns all DocumentTags linked with the SourceDocument.",
)
async def get_all_tags(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> List[DocumentTagRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return [
        DocumentTagRead.from_orm(doc_tag_db_obj)
        for doc_tag_db_obj in sdoc_db_obj.document_tags
    ]


@router.delete(
    "/{sdoc_id}/tags",
    tags=tags,
    response_model=Optional[SourceDocumentRead],
    summary="Unlinks all DocumentTags with the SourceDocument",
    description="Unlinks all DocumentTags of the SourceDocument.",
)
async def unlinks_all_tags(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.unlink_all_document_tags(db=db, id=sdoc_id)
    return SourceDocumentRead.from_orm(sdoc_db_obj)


@router.patch(
    "/{sdoc_id}/tag/{tag_id}",
    tags=tags,
    response_model=Optional[SourceDocumentRead],
    summary="Links a DocumentTag with the SourceDocument",
    description="Links a DocumentTag with the SourceDocument with the given ID if it exists",
)
async def link_tag(
    *, db: Session = Depends(get_db_session), sdoc_id: int, tag_id: int
) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.link_document_tag(db=db, sdoc_id=sdoc_id, tag_id=tag_id)
    return SourceDocumentRead.from_orm(sdoc_db_obj)


@router.delete(
    "/{sdoc_id}/tag/{tag_id}",
    tags=tags,
    response_model=Optional[SourceDocumentRead],
    summary="Unlinks the DocumentTag from the SourceDocument",
    description="Unlinks the DocumentTags from the SourceDocument.",
)
async def unlink_tag(
    *, db: Session = Depends(get_db_session), sdoc_id: int, tag_id: int
) -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    sdoc_db_obj = crud_sdoc.unlink_document_tag(db=db, sdoc_id=sdoc_id, tag_id=tag_id)
    return SourceDocumentRead.from_orm(sdoc_db_obj)


@router.put(
    "/{sdoc_id}/memo",
    tags=tags,
    response_model=Optional[MemoRead],
    summary="Adds a Memo to the SourceDocument",
    description="Adds a Memo to the SourceDocument with the given ID if it exists",
)
async def add_memo(
    *, db: Session = Depends(get_db_session), sdoc_id: int, memo: MemoCreate
) -> Optional[MemoRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.create_for_sdoc(db=db, sdoc_id=sdoc_id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.dict(exclude={"attached_to"}),
        attached_object_id=sdoc_id,
        attached_object_type=AttachedObjectType.source_document,
    )


@router.get(
    "/{sdoc_id}/memo",
    tags=tags,
    response_model=List[MemoRead],
    summary="Returns all Memo attached to the SourceDocument",
    description="Returns all Memo attached to the SourceDocument with the given ID if it exists.",
)
async def get_memos(
    *, db: Session = Depends(get_db_session), sdoc_id: int
) -> List[MemoRead]:
    db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return get_object_memos(db_obj=db_obj)


@router.get(
    "/{sdoc_id}/memo/{user_id}",
    tags=tags,
    response_model=List[MemoRead],
    summary="Returns the Memos attached to the SourceDocument of the User with the given ID",
    description=(
        "Returns the Memos attached to the SourceDocument with the given ID of the User with the"
        " given ID if it exists."
    ),
)
async def get_user_memos(
    *, db: Session = Depends(get_db_session), sdoc_id: int, user_id: int
) -> List[MemoRead]:
    db_obj = crud_sdoc.read(db=db, id=sdoc_id)
    return get_object_memos(db_obj=db_obj, user_id=user_id)


@router.get(
    "/{sdoc_id}/relatedmemos/{user_id}",
    tags=tags,
    response_model=List[MemoRead],
    summary=(
        "Returns the Memo attached to the SourceDocument of the User with the given ID and all memos "
        "attached to its annotations."
    ),
    description=(
        "Returns the Memo attached to the SourceDocument of the User with the given ID and all memos"
        " attached to its annotations."
    ),
)
async def get_related_user_memos(
    *, db: Session = Depends(get_db_session), sdoc_id: int, user_id: int
) -> List[MemoRead]:
    db_objs = crud_memo.read_by_user_and_sdoc(db=db, user_id=user_id, sdoc_id=sdoc_id)
    memos = [
        crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj) for db_obj in db_objs
    ]
    return memos
