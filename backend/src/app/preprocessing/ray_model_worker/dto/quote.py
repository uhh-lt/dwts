from typing import List, NamedTuple, Tuple

from pydantic import BaseModel, Field


class QuoteBase(BaseModel):
    id: int = Field(description="ID of the QuoteJob")
    project_id: int = Field(description="Project the QuoteJob belongs to")


class Token(NamedTuple):
    start: int
    end: int
    sent: int
    text: str


class Span(NamedTuple):
    start: int
    end: int
    text: str


class QuoteInputDoc(BaseModel):
    id: int
    text: str = Field(description="Full text of the document")
    sentences: List[Span] = Field(description="sentences as spans")
    tokens: List[Token] = Field(description="tokens with offsets")


class QuoteTuple(BaseModel):
    quote: List[Tuple[int, int]]
    speaker: List[Tuple[int, int]]
    cue: List[Tuple[int, int]]
    addressee: List[Tuple[int, int]]
    frame: List[Tuple[int, int]]
    typ: str


class QuoteOutputDoc(BaseModel):
    id: int
    quotes: List[QuoteTuple]


class QuoteJobInput(QuoteBase):
    id: int = Field(description="ID of the QuoteJob")
    project_id: int = Field(description="Project the QuoteJob belongs to")
    documents: List[QuoteInputDoc]


class QuoteJobOutput(QuoteBase):
    documents: List[QuoteOutputDoc]
    info: List[dict]
