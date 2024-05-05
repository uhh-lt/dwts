from typing import Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session, skip_limit_params
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.dto.search import (
    MemoContentQuery,
    PaginatedMemoSearchResults,
    SearchColumns,
    SimSearchImageHit,
    SimSearchQuery,
    SimSearchSentenceHit,
    ElasticSearchDocumentHit,
)
from app.core.data.dto.search_stats import KeywordStat, SpanEntityStat, TagStat
from app.core.filters.columns import ColumnInfo
from app.core.filters.filtering import Filter
from app.core.filters.sorting import Sort
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.search_service import SearchService

router = APIRouter(
    prefix="/search", dependencies=[Depends(get_current_user)], tags=["search"]
)

ss = SearchService()
es = ElasticSearchService()


@router.post(
    "/sdoc_info",
    response_model=List[ColumnInfo[SearchColumns]],
    summary="Returns Search Info.",
)
def search_sdocs_info(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> List[ColumnInfo[SearchColumns]]:
    authz_user.assert_in_project(project_id)

    return SearchService().search_info(project_id=project_id)


@router.post(
    "/sdoc",
    response_model=list[ElasticSearchDocumentHit],
    summary="Returns all SourceDocument Ids and their scores and (optional) hightlights that match the query parameters.",
)
def search_sdocs(
    *,
    search_query: str,
    project_id: int,
    expert_mode: bool,
    highlight: bool,
    filter: Filter[SearchColumns],
    sorts: List[Sort[SearchColumns]],
    authz_user: AuthzUser = Depends(),
) -> list[ElasticSearchDocumentHit]:
    authz_user.assert_in_project(project_id)

    return SearchService().search(
        search_query=search_query,
        expert_mode=expert_mode,
        highlight=highlight,
        project_id=project_id,
        filter=filter,
        sorts=sorts,
    )


@router.post(
    "/code_stats",
    response_model=List[SpanEntityStat],
    summary="Returns SpanEntityStats for the given SourceDocuments.",
)
def search_code_stats(
    *,
    db: Session = Depends(get_db_session),
    code_id: int,
    sdoc_ids: List[int],
    sort_by_global: bool = False,
    authz_user: AuthzUser = Depends(),
) -> List[SpanEntityStat]:
    if len(sdoc_ids) == 0:
        return []

    authz_user.assert_in_same_project_as(Crud.CODE, code_id)
    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)

    # TODO Flo for large corpora this gets very slow. Hence we have to set a limit and in future implement some lazy
    #  loading or scrolling in the frontend with skip and limit.
    code_stats = SearchService().compute_code_statistics(
        code_id=code_id, sdoc_ids=set(sdoc_ids)
    )
    if sort_by_global:
        code_stats.sort(key=lambda x: x.global_count, reverse=True)
    return code_stats


@router.post(
    "/keyword_stats",
    response_model=List[KeywordStat],
    summary="Returns KeywordStats for the given SourceDocuments.",
)
def search_keyword_stats(
    *,
    project_id: int,
    sdoc_ids: List[int],
    sort_by_global: bool = False,
    top_k: int = 50,
    authz_user: AuthzUser = Depends(),
) -> List[KeywordStat]:
    if len(sdoc_ids) == 0:
        return []

    authz_user.assert_in_project(project_id)
    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)

    keyword_stats = SearchService().compute_keyword_statistics(
        proj_id=project_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        keyword_stats.sort(key=lambda x: x.global_count, reverse=True)
    return keyword_stats


@router.post(
    "/tag_stats",
    response_model=List[TagStat],
    summary="Returns Stat for the given SourceDocuments.",
)
def search_tag_stats(
    *,
    sdoc_ids: List[int],
    sort_by_global: bool = False,
    authz_user: AuthzUser = Depends(),
) -> List[TagStat]:
    if len(sdoc_ids) == 0:
        return []

    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)

    tag_stats = SearchService().compute_tag_statistics(sdoc_ids=set(sdoc_ids))
    if sort_by_global:
        tag_stats.sort(key=lambda x: x.global_count, reverse=True)
    return tag_stats


@router.post(
    "/lexical/memo/content",
    response_model=PaginatedMemoSearchResults,
    summary="Returns all Memos where the content matches the query via lexical search",
)
def search_memos_by_content_query(
    *,
    content_query: MemoContentQuery,
    skip_limit: Dict[str, int] = Depends(skip_limit_params),
    authz_user: AuthzUser = Depends(),
) -> PaginatedMemoSearchResults:
    authz_user.assert_in_project(content_query.proj_id)

    return es.search_memos_by_content_query(
        proj_id=content_query.proj_id,
        query=content_query.content_query,
        user_id=content_query.user_id,
        starred=content_query.starred,
        **skip_limit,
    )


@router.post(
    "/simsearch/sentences",
    response_model=List[SimSearchSentenceHit],
    summary="Returns similar sentences according to a textual or visual query.",
)
def find_similar_sentences(
    query: SimSearchQuery, authz_user: AuthzUser = Depends()
) -> List[SimSearchSentenceHit]:
    authz_user.assert_in_project(query.proj_id)

    return ss.find_similar_sentences(query=query)


@router.post(
    "/simsearch/images",
    response_model=List[SimSearchImageHit],
    summary="Returns similar images according to a textual or visual query.",
)
def find_similar_images(
    query: SimSearchQuery, authz_user: AuthzUser = Depends()
) -> List[SimSearchImageHit]:
    authz_user.assert_in_project(query.proj_id)

    return ss.find_similar_images(query=query)
