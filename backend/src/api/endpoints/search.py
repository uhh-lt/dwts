from typing import List, Optional, Union

from fastapi import APIRouter, Depends

import app.core.search.sdoc_search.sdoc_search as sdoc_search
from api.dependencies import get_current_user
from app.core.analysis.search_statistics.search_statistics import (
    compute_code_statistics,
    compute_keyword_statistics,
    compute_tag_statistics,
)
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.dto.search import (
    PaginatedElasticSearchDocumentHits,
    SimSearchImageHit,
    SimSearchSentenceHit,
)
from app.core.data.dto.search_stats import KeywordStat, SpanEntityStat, TagStat
from app.core.db.elasticsearch_service import ElasticSearchService
from app.core.search.column_info import ColumnInfo
from app.core.search.filtering import Filter
from app.core.search.sdoc_search.sdoc_search_columns import SdocColumns
from app.core.search.sorting import Sort

router = APIRouter(
    prefix="/search", dependencies=[Depends(get_current_user)], tags=["search"]
)

es = ElasticSearchService()


@router.post(
    "/sdoc_info",
    response_model=List[ColumnInfo[SdocColumns]],
    summary="Returns Search Info.",
)
def search_sdocs_info(
    *, project_id: int, authz_user: AuthzUser = Depends()
) -> List[ColumnInfo[SdocColumns]]:
    authz_user.assert_in_project(project_id)

    return sdoc_search.search_info(project_id=project_id)


@router.post(
    "/sdoc",
    response_model=PaginatedElasticSearchDocumentHits,
    summary="Returns all SourceDocument Ids and their scores and (optional) hightlights that match the query parameters.",
)
def search_sdocs(
    *,
    project_id: int,
    search_query: str,
    expert_mode: bool,
    filter: Filter[SdocColumns],
    sorts: List[Sort[SdocColumns]],
    highlight: bool,
    page_number: Optional[int] = None,
    page_size: Optional[int] = None,
    authz_user: AuthzUser = Depends(),
) -> PaginatedElasticSearchDocumentHits:
    authz_user.assert_in_project(project_id)
    return sdoc_search.search(
        search_query=search_query,
        expert_mode=expert_mode,
        highlight=highlight,
        project_id=project_id,
        filter=filter,
        sorts=sorts,
        page_number=page_number,
        page_size=page_size,
    )


@router.post(
    "/code_stats_by_sdocs",
    response_model=List[SpanEntityStat],
    summary="Returns SpanEntityStats for the given SourceDocuments.",
)
def filter_code_stats(
    *,
    authz_user: AuthzUser = Depends(),
    # code stat params
    code_id: int,
    sort_by_global: bool = False,
    # filter params
    sdoc_ids: List[int],
) -> List[SpanEntityStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute code stats
    authz_user.assert_in_same_project_as(Crud.CODE, code_id)
    code_stats = compute_code_statistics(code_id=code_id, sdoc_ids=set(sdoc_ids))
    if sort_by_global:
        code_stats.sort(key=lambda x: x.global_count, reverse=True)
    return code_stats


@router.post(
    "/keyword_stats_by_sdocs",
    response_model=List[KeywordStat],
    summary="Returns KeywordStats for the given SourceDocuments.",
)
def filter_keyword_stats(
    *,
    authz_user: AuthzUser = Depends(),
    project_id: int,
    # keyword stat params
    sort_by_global: bool = False,
    top_k: int = 50,
    # filter params
    sdoc_ids: List[int],
) -> List[KeywordStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute keyword stats
    keyword_stats = compute_keyword_statistics(
        proj_id=project_id, sdoc_ids=set(sdoc_ids), top_k=top_k
    )
    if sort_by_global:
        keyword_stats.sort(key=lambda x: x.global_count, reverse=True)
    return keyword_stats


@router.post(
    "/tag_stats_by_sdocs",
    response_model=List[TagStat],
    summary="Returns Stat for the given SourceDocuments.",
)
def filter_tag_stats(
    *,
    authz_user: AuthzUser = Depends(),
    # keyword stat params
    sort_by_global: bool = False,
    # filter params
    sdoc_ids: List[int],
) -> List[TagStat]:
    if len(sdoc_ids) == 0:
        return []

    # compute tag stats
    tag_stats = compute_tag_statistics(sdoc_ids=set(sdoc_ids))
    if sort_by_global:
        tag_stats.sort(key=lambda x: x.global_count, reverse=True)
    return tag_stats


@router.post(
    "/simsearch/sentences",
    response_model=List[SimSearchSentenceHit],
    summary="Returns similar sentences according to a textual or visual query.",
)
def find_similar_sentences(
    proj_id: int,
    query: Union[str, List[str], int],
    top_k: int,
    threshold: float,
    filter: Filter[SdocColumns],
    authz_user: AuthzUser = Depends(),
) -> List[SimSearchSentenceHit]:
    authz_user.assert_in_project(proj_id)

    return sdoc_search.find_similar_sentences(
        proj_id=proj_id, query=query, top_k=top_k, threshold=threshold, filter=filter
    )


@router.post(
    "/simsearch/images",
    response_model=List[SimSearchImageHit],
    summary="Returns similar images according to a textual or visual query.",
)
def find_similar_images(
    proj_id: int,
    query: Union[str, List[str], int],
    top_k: int,
    threshold: float,
    filter: Filter[SdocColumns],
    authz_user: AuthzUser = Depends(),
) -> List[SimSearchImageHit]:
    authz_user.assert_in_project(proj_id)

    return sdoc_search.find_similar_images(
        proj_id=proj_id, query=query, top_k=top_k, threshold=threshold, filter=filter
    )
