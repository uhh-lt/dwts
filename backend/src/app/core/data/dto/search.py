from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.core.data.dto.dto_base import UpdateDTOBase
from app.core.data.dto.memo import AttachedObjectType


class ElasticSearchDocumentCreate(BaseModel):
    filename: str = Field(description="The filename of the SourceDocument")
    content: str = Field(description="The raw text of the SourceDocument")
    sdoc_id: int = Field(
        description="The ID of the SourceDocument as it is in the SQL DB"
    )
    project_id: int = Field(
        description="The ID of the Project the SourceDocument belongs to"
    )
    created: datetime = Field(
        description="The created date of the SourceDocument", default=datetime.now()
    )


class ElasticSearchDocumentHit(BaseModel):
    document_id: int = Field(description="The ID of the Document")
    score: Optional[float] = Field(
        description="The score of the Document that was found by a ES Query",
        default=None,
    )
    highlights: list[str] = Field(
        description="The highlights found within the document.", default=[]
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
        description=("The type of the Object the Memo is attached to")
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


class PaginatedElasticSearchDocumentHits(BaseModel):
    hits: List[ElasticSearchDocumentHit] = Field(
        description=(
            "The IDs, scores and (optional) highlights of Document search results on "
            "the requested page."
        )
    )
    total_results: int = Field(
        description="The total number of hits. Used for pagination."
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


class SimSearchDocumentHit(SimSearchHit):
    compared_sdoc_id: int = Field(
        description="The ID of the SourceDocument that was compared."
    )


class SimSearchImageHit(SimSearchHit):
    pass
