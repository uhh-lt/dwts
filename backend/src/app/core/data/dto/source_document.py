from datetime import datetime
from enum import Enum
from typing import List, Optional, Tuple

from app.core.data.doc_type import DocType
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.source_document_data import SourceDocumentDataCreate
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataRead
from app.core.data.dto.util import PaginatedResults
from pydantic import BaseModel, Field

from .dto_base import UpdateDTOBase

SDOC_FILENAME_MAX_LENGTH = 200
SDOC_SUFFIX_MAX_LENGTH = 30


class SDocStatus(str, Enum):
    unfinished_or_erroneous = "unfinished_or_erroneous"
    finished = "finished"  # preprocessing has finished


# Properties shared across all DTOs
class SourceDocumentBaseDTO(BaseModel):
    filename: str = Field(
        description="Filename of the SourceDocument",
        max_length=SDOC_FILENAME_MAX_LENGTH + SDOC_SUFFIX_MAX_LENGTH,
    )
    name: Optional[str] = Field(
        description="User-defined name of the document", default=None
    )
    doctype: DocType = Field(description="DOCTYPE of the SourceDocument")
    status: SDocStatus = Field(description="Status of the SourceDocument")
    project_id: int = Field(description="Project the SourceDocument belongs to")


# Properties for updating
class SourceDocumentUpdate(BaseModel, UpdateDTOBase):
    name: Optional[str] = Field(
        description="User-defined name of the document", default=None
    )


# Properties for reading (as in ORM)
class SourceDocumentRead(SourceDocumentBaseDTO):
    id: int = Field(description="ID of the SourceDocument")
    created: datetime = Field(description="The created timestamp of the SourceDocument")
    updated: datetime = Field(description="Updated timestamp of the Memo")

    class Config:
        orm_mode = True


class SourceDocumentReadAction(SourceDocumentRead):
    tags: List[DocumentTagRead] = Field(description="Tags of the SourceDocument")
    metadata: List[SourceDocumentMetadataRead] = Field(
        description="Metadata of the SourceDocument"
    )


class PaginatedSourceDocumentReads(PaginatedResults):
    sdocs: List[SourceDocumentRead] = Field(
        description="The SourceDocuments on this page"
    )


class SourceDocumentContent(SourceDocumentBaseDTO):
    content: str = Field(
        description="The (textual) content of the SourceDocument the content belongs to."
    )


class SourceDocumentHTML(SourceDocumentRead):
    html: str = Field(description="The (html) content of the SourceDocument.")


class SourceDocumentTokens(SourceDocumentRead):
    tokens: List[str] = Field(
        description="The (textual) list Tokens of the SourceDocument the Tokens belong to."
    )
    token_character_offsets: Optional[List[Tuple[int, int]]] = Field(
        description=("The list of character offsets of" " the Tokens"),
        default=None,
    )


class SourceDocumentSentences(SourceDocumentRead):
    sentences: List[str] = Field(
        description="The Sentences of the SourceDocument the Sentences belong to."
    )
    sentence_character_offsets: Optional[List[Tuple[int, int]]] = Field(
        description=("The list of character offsets of" " the Sentences"),
        default=None,
    )


class SourceDocumentKeywords(BaseModel):
    source_document_id: int = Field(
        description="ID of the SourceDocument the Keywords belong to."
    )
    keywords: List[str] = Field(
        description="The list of Keywords of the SourceDocument the Keywords belong to."
    )


class SourceDocumentCreate(SourceDocumentBaseDTO):
    pass


class SourceDocumentWithData(SourceDocumentRead, SourceDocumentDataCreate):
    @property
    def tokens(self):
        return [self.content[s:e] for s, e in zip(self.token_starts, self.token_ends)]

    @property
    def token_character_offsets(self):
        return [(s, e) for s, e in zip(self.token_starts, self.token_ends)]

    @property
    def sentences(self):
        return [
            self.content[s:e] for s, e in zip(self.sentence_starts, self.sentence_ends)
        ]

    @property
    def sentence_character_offsets(self):
        return [(s, e) for s, e in zip(self.sentence_starts, self.sentence_ends)]
