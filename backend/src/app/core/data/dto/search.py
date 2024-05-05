from datetime import datetime
from typing import List, Optional, Union

from pydantic import BaseModel, Field

from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.data.dto.memo import AttachedObjectType, MemoRead
from app.core.data.dto.util import PaginatedResults
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.filters.columns import AbstractColumns
from app.core.filters.filtering import Filter
from app.core.filters.filtering_operators import FilterOperator, FilterValueType


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
    score: Optional[float] = Field(
        description="The score of the SourceDocument that was found by a ES Query",
        default = None
    )
    highlights: Optional[list[str]] = Field(
        description="The highlights found within the document.",
        default = []
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


class ElasticMemoHit(ElasticSearchMemoRead):
    score: float = Field(
        description="The score of the Memo that was found by a ES Query"
    )


class PaginatedElasticSearchDocumentHits(PaginatedResults):
    hits: List[ElasticSearchDocumentHit] = Field(
        description=(
            "The IDs, scores and (optional) highlights of SourceDocument search results on " "the requested page."
        )
    )


class PaginatedMemoSearchResults(PaginatedResults):
    memos: List[MemoRead] = Field(
        description="The Memo search results on the requested page."
    )


class SearchColumns(str, AbstractColumns):
    SOURCE_DOCUMENT_TYPE = "SC_SOURCE_DOCUMENT_TYPE"
    SOURCE_DOCUMENT_FILENAME = "SC_SOURCE_DOCUMENT_FILENAME"
    DOCUMENT_TAG_ID_LIST = "SC_DOCUMENT_TAG_ID_LIST"
    CODE_ID_LIST = "SC_CODE_ID_LIST"
    USER_ID_LIST = "SC_USER_ID_LIST"
    SPAN_ANNOTATIONS = "SC_SPAN_ANNOTATIONS"

    def get_filter_column(self, **kwargs):
        subquery_dict = kwargs["subquery_dict"]

        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return SourceDocumentORM.doctype
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return subquery_dict[SearchColumns.DOCUMENT_TAG_ID_LIST]
            case SearchColumns.CODE_ID_LIST:
                return subquery_dict[SearchColumns.CODE_ID_LIST]
            case SearchColumns.USER_ID_LIST:
                return subquery_dict[SearchColumns.USER_ID_LIST]
            case SearchColumns.SPAN_ANNOTATIONS:
                return subquery_dict[SearchColumns.SPAN_ANNOTATIONS]

    def get_filter_operator(self) -> FilterOperator:
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterOperator.STRING
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return FilterOperator.ID
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return FilterOperator.ID_LIST
            case SearchColumns.CODE_ID_LIST:
                return FilterOperator.ID_LIST
            case SearchColumns.USER_ID_LIST:
                return FilterOperator.ID_LIST
            case SearchColumns.SPAN_ANNOTATIONS:
                return FilterOperator.ID_LIST

    def get_filter_value_type(self) -> FilterValueType:
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return FilterValueType.INFER_FROM_OPERATOR
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return FilterValueType.DOC_TYPE
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return FilterValueType.TAG_ID
            case SearchColumns.CODE_ID_LIST:
                return FilterValueType.CODE_ID
            case SearchColumns.USER_ID_LIST:
                return FilterValueType.USER_ID
            case SearchColumns.SPAN_ANNOTATIONS:
                return FilterValueType.SPAN_ANNOTATION

    def get_sort_column(self, **kwargs):
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return SourceDocumentORM.filename
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return SourceDocumentORM.doctype
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return None
            case SearchColumns.CODE_ID_LIST:
                return None
            case SearchColumns.USER_ID_LIST:
                return None
            case SearchColumns.SPAN_ANNOTATIONS:
                return None

    def get_label(self) -> str:
        match self:
            case SearchColumns.SOURCE_DOCUMENT_FILENAME:
                return "Document name"
            case SearchColumns.SOURCE_DOCUMENT_TYPE:
                return "Type"
            case SearchColumns.DOCUMENT_TAG_ID_LIST:
                return "Tags"
            case SearchColumns.CODE_ID_LIST:
                return "Code"
            case SearchColumns.USER_ID_LIST:
                return "Annotated by"
            case SearchColumns.SPAN_ANNOTATIONS:
                return "Span annotations"


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
        default=100,
    )
    threshold: float = Field(
        description="The minimum distance to use for the sim search.",
        default=0.0,
        ge=0.0,
        le=1.0,
    )
    filter: Filter[SearchColumns] = Field(
        description="Only return documents matching this filter"
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
