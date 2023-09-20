from typing import Dict, List, Tuple

from app.docprepro.text.models.autospan import AutoSpan
from pydantic import BaseModel, Field


class PreProTextDoc(BaseModel):
    filename: str

    project_id: int
    sdoc_id: int

    mime_type: str
    text: str
    html: str

    metadata: Dict[str, str] = Field(default=dict())
    tokens: List[str] = Field(default=list())
    token_character_offsets: List[Tuple[int, int]] = Field(default=list())
    text2html_character_offsets: List[int] = Field(default=list())
    lemmas: List[str] = Field(default=list())
    pos: List[str] = Field(default=list())
    stopwords: List[bool] = Field(default=list())
    keywords: List[str] = Field(default=list())
    word_freqs: Dict[str, int] = Field(default=dict())
    spans: Dict[str, List[AutoSpan]] = Field(default=dict())
    sentences: List[AutoSpan] = Field(default=list())
