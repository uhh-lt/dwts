from datetime import datetime
from typing import Dict, List, Optional, Set, Union

from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.doc_type import DocType
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.data.dto.memo import AttachedObjectType, MemoRead
from app.core.data.dto.util import PaginatedResults
from pydantic import BaseModel, Field


class SpanEntity(BaseModel):
    code_id: int = Field(description="The ID of the Code related to the SpanAnnotation")
    span_text: str = Field(description="The SpanText the SpanAnnotation spans")


class SpanEntityFrequency(SpanEntity):
    sdoc_id: int = Field(description="The ID of the SourceDocument.")
    count: int = Field(
        description="Number of occurrences of the SpanEntity in the SourceDocument."
    )


class SpanEntityDocumentFrequency(SpanEntity):
    filtered_count: int = Field(
        description="Number of occurrences of the SpanEntity in a collection of SourceDocuments."
    )
    global_count: int = Field(
        description="Number of occurrences of the SpanEntity in a collection of SourceDocuments."
    )


class SpanEntityDocumentFrequencyResult(BaseModel):
    stats: Dict[int, List[SpanEntityDocumentFrequency]] = Field(
        description="Map of Code ID to SpanEntityDocumentFrequency"
    )


class KeywordStat(BaseModel):
    keyword: str = Field(description="The counted keyword.")
    filtered_count: int = Field(
        description="Number of occurrences of the keyword in the filtered collection"
    )
    global_count: int = Field(
        description="Number of occurrences of the keyword in the entire collection"
    )


class TagStat(BaseModel):
    tag: DocumentTagRead = Field(description="The counted document tag.")
    filtered_count: int = Field(
        description="Number of occurrences of the document tag in the filtered documents"
    )
    global_count: int = Field(
        description="Number of occurrences of the document tag in all documents"
    )


class SpanEntityStatsQueryParameters(BaseModel):
    proj_id: int = Field(
        description="The ID of the Project the SourceDocuments have to belong to."
    )
    sdoc_ids: Set[int] = Field(
        description="List of IDs of SourceDocuments the stats are computed for."
    )


class TagStatsQueryParameters(BaseModel):
    sdoc_ids: Set[int] = Field(
        description="List of IDs of SourceDocuments the stats are computed for."
    )


class KeyValue(BaseModel):
    key: str = Field(description="The key of the Metadata")
    value: str = Field(description="The value of the Metadata")


class SearchSDocsQueryParameters(BaseModel):
    proj_id: int = Field(
        description="The ID of the Project the SourceDocuments have to belong to."
    )

    user_ids: Optional[Set[int]] = Field(
        description="The IDs of the User the SourceDocuments have to belong to.",
        default={SYSTEM_USER_ID},
    )

    keywords: Optional[List[str]] = Field(
        description=(
            "List of Keywords that have to be present in"
            " the SourceDocuments keywords (via Elasticsearch)"
        ),
        default=None,
    )

    search_terms: Optional[List[str]] = Field(
        description=(
            "List of SearchTerms that have to be present in"
            " the SourceDocuments content (via Elasticsearch)"
        ),
        default=None,
    )

    filename: Optional[str] = Field(
        description=(
            "Filename that have to be present in"
            " the SourceDocuments Filename (via Elasticsearch)"
        ),
        default=None,
    )

    span_entities: Optional[List[SpanEntity]] = Field(
        description=(
            "List of SpanEntities that have to be present in" " the SourceDocuments"
        ),
        default=None,
    )

    tag_ids: Optional[List[int]] = Field(
        description=(
            "List of IDs of DocumentTags the SourceDocuments have to be" " tagged with"
        ),
        default=None,
    )

    metadata: Optional[List[KeyValue]] = Field(
        description=(
            "List of key value pairs that have to be present in the "
            "SourceDocuments metadata have to be"
        ),
        default=None,
    )

    all_tags: Optional[bool] = Field(
        description=(
            "If true return SourceDocuments tagged with all DocumentTags, or any"
            "of the DocumentTags otherwise"
        ),
        default=True,
    )

    doc_types: Optional[List[DocType]] = Field(
        description="Only return SourceDocuments with the given DocTypes",
        default=[DocType.text, DocType.image, DocType.audio, DocType.video],
    )


class SourceDocumentContentQuery(BaseModel):
    proj_id: int = Field(
        description="The ID of the Project the SourceDocuments have to belong to."
    )
    content_query: str = Field(
        description="The query term to search within the content of the SourceDocuments",
        min_length=1,
    )


class SourceDocumentFilenameQuery(BaseModel):
    proj_id: int = Field(
        description="The ID of the Project the SourceDocuments have to belong to."
    )
    filename_query: str = Field(
        description="The query term to search within the filename of the SourceDocuments",
        min_length=1,
    )
    prefix: bool = Field(
        description="If true, filename prefix search is done. If false exact filename is searched."
    )


class MemoQueryBase(BaseModel):
    proj_id: int = Field(
        description="The ID of the Project the Memo have to belong to."
    )
    user_id: int = Field(description="The ID of the User the Memo have to belong to.")
    starred: Optional[bool] = Field(
        description=(
            "If set (i.e. not NULL / NONE), only returns Memo that have the "
            "given starred status"
        ),
        default=None,
    )


class MemoContentQuery(MemoQueryBase):
    content_query: str = Field(
        description="The query term to search within the content of the Memo",
        min_length=1,
    )


class MemoTitleQuery(MemoQueryBase):
    title_query: str = Field(
        description="The query term to search within the title of the Memo",
        min_length=1,
    )
    prefix: bool = Field(
        description="If true, filename prefix search is done. If false exact title is searched."
    )


class ElasticSearchIntegerRange(BaseModel):
    gte: int
    lt: int


class ElasticSearchDocumentCreate(BaseModel):
    filename: str = Field(description="The filename of the SourceDocument")
    content: str = Field(description="The raw text of the SourceDocument")
    html: str = Field(description="The html of the SourceDocument")
    tokens: List[str] = Field(
        description="The list of the tokens in the SourceDocument"
    )
    token_character_offsets: Optional[List[ElasticSearchIntegerRange]] = Field(
        description=(
            "The list of character " "offsets for the tokens " "in the SourceDocument"
        )
    )
    sentences: List[str] = Field(
        description="The list of the sentences in the SourceDocument"
    )
    sentence_character_offsets: Optional[List[ElasticSearchIntegerRange]] = Field(
        description=(
            "The list of character "
            "offsets for the "
            "sentences "
            "in the SourceDocument"
        )
    )
    keywords: List[str] = Field(
        description="The list of keywords of the SourceDocument"
    )
    sdoc_id: int = Field(
        description="The ID of the SourceDocument as it is in the SQL DB"
    )
    project_id: int = Field(
        description="The ID of the Project the SourceDocument belongs to"
    )
    created: datetime = Field(
        description="The created date of the SourceDocument", default=datetime.now()
    )


class ElasticSearchDocumentRead(BaseModel):
    filename: Optional[str] = Field(description="The filename of the SourceDocument")
    content: Optional[str] = Field(description="The raw text of the SourceDocument")
    html: Optional[str] = Field(description="The html of the SourceDocument")
    tokens: Optional[List[str]] = Field(
        description="The list of the tokens in the SourceDocument"
    )
    token_character_offsets: Optional[List[ElasticSearchIntegerRange]] = Field(
        description=(
            "The list of character " "offsets for the tokens " "in the SourceDocument"
        )
    )
    sentences: Optional[List[str]] = Field(
        description="The list of the sentences in the SourceDocument"
    )
    sentence_character_offsets: Optional[List[ElasticSearchIntegerRange]] = Field(
        description=(
            "The list of character "
            "offsets for the "
            "sentences "
            "in the SourceDocument"
        )
    )
    keywords: Optional[List[str]] = Field(
        description="The list of keywords of the SourceDocument"
    )
    sdoc_id: Optional[int] = Field(
        description="The ID of the SourceDocument as it is in the SQL DB"
    )
    project_id: Optional[int] = Field(
        description="The ID of the Project the SourceDocument belongs to"
    )
    created: Optional[datetime] = Field(
        description="The created date of the SourceDocument", default=datetime.now()
    )


class ElasticSearchDocumentHit(BaseModel):
    sdoc_id: int = Field(
        description="The ID of the SourceDocument as it is in the SQL DB"
    )
    score: float = Field(
        description="The score of the SourceDocument that was found by a ES Query"
    )


class ElasticSearchMemoCreate(BaseModel):
    title: str = Field(description="The title of the Memo")
    content: str = Field(description="The content of the Memo")
    starred: Optional[bool] = Field(
        description="Starred flag of the Memo", default=False
    )
    memo_id: int = Field(description="The ID of the Memo as it is in the SQL DB")
    project_id: int = Field(description="The ID of the Project the Memo belongs to")
    user_id: int = Field(description="The ID of the User the Memo belongs to")
    attached_object_id: int = Field(
        description="The ID of the Object the Memo is attached to"
    )
    attached_object_type: AttachedObjectType = Field(
        description="The type of the Object the Memo is attached to"
    )
    updated: datetime = Field(
        description="The created date of the Memo", default=datetime.now()
    )
    created: datetime = Field(
        description="The created date of the Memo", default=datetime.now()
    )


class ElasticSearchMemoRead(BaseModel):
    title: Optional[str] = Field(description="The title of the Memo")
    content: Optional[str] = Field(description="The content of the Memo")
    starred: Optional[bool] = Field(description="Starred flag of the Memo")
    memo_id: Optional[int] = Field(
        description="The ID of the Memo as it is in the SQL DB"
    )
    project_id: Optional[int] = Field(
        description="The ID of the Project the Memo belongs to"
    )
    user_id: Optional[int] = Field(description="The ID of the User the Memo belongs to")
    attached_object_id: Optional[int] = Field(
        description="The ID of the Object the Memo is attached to"
    )
    attached_object_type: Optional[AttachedObjectType] = Field(
        description=("The type of the Object the Memo is " "attached to")
    )
    updated: Optional[datetime] = Field(
        description="The created date of the Memo", default=datetime.now()
    )
    created: Optional[datetime] = Field(
        description="The created date of the Memo", default=datetime.now()
    )


class ElasticSearchMemoUpdate(BaseModel, UpdateDTOBase):
    memo_id: int = Field(description="The ID of the Memo as it is in the SQL DB")
    title: Optional[str] = Field(description="The title of the Memo", default=None)
    content: Optional[str] = Field(description="The content of the Memo", default=None)
    starred: Optional[bool] = Field(
        description="Starred flag of the Memo", default=None
    )
    attached_object_id: Optional[int] = Field(
        description="The ID of the Object the Memo is attached to"
    )
    attached_object_type: Optional[AttachedObjectType] = Field(
        description=("The type of the Object the Memo is " "attached to")
    )


class ElasticMemoHit(ElasticSearchMemoRead):
    score: float = Field(
        description="The score of the Memo that was found by a ES Query"
    )


class PaginatedElasticSearchDocumentHits(PaginatedResults):
    hits: List[ElasticSearchDocumentHit] = Field(
        description=(
            "The IDs of SourceDocument search results on " "the requested page."
        )
    )


class PaginatedMemoSearchResults(PaginatedResults):
    memos: List[MemoRead] = Field(
        description="The Memo search results on the requested page."
    )


class SimSearchQuery(BaseModel):
    proj_id: int = Field(
        description="The ID of the Project the SourceDocuments have to belong to."
    )
    query: Union[str, List[str], int] = Field(
        description=(
            "The query term. This can be either a single string, "
            "a list of strings for which the average embedding gets computed, "
            "or an integer which is interpreted as the SDoc ID of an Image."
        )
    )
    top_k: int = Field(
        description="The number of results to return.",
        default=10,
    )
    threshold: float = Field(
        description="The minimum distance to use for the sim search.",
        default=0.0,
        min=0.0,
        max=1.0,
    )


class SimSearchHit(BaseModel):
    sdoc_id: int = Field(
        description="The ID of the SourceDocument similar to the query."
    )
    score: float = Field(description="The similarity score.")


class SimSearchSentenceHit(SimSearchHit):
    sentence_id: int = Field(
        description="The sentence id with respect to the SourceDocument"
    )


class SimSearchImageHit(SimSearchHit):
    pass
