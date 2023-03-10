from typing import Any, List, Union

from PIL.Image import Image

# noinspection PyUnresolvedReferences,PyProtectedMember
from celery import Signature

# Flo: Task names (as they could be imported). Has to be defined before PreProTextDoc!
index_text_document_in_faiss = (
    "app.docprepro.simsearch.preprocess.index_text_document_in_faiss"
)
index_image_document_in_faiss = (
    "app.docprepro.simsearch.preprocess.index_image_document_in_faiss"
)
find_similar_images = "app.docprepro.simsearch.preprocess.find_similar_images"
find_similar_sentences = "app.docprepro.simsearch.preprocess.find_similar_sentences"

from app.docprepro.text.models.preprotextdoc import PreProTextDoc


def index_text_documents_apply_async(pptds: List[PreProTextDoc]) -> Any:
    return Signature(
        index_text_document_in_faiss, kwargs={"pptds": pptds}
    ).apply_async()


def index_image_documents_apply_async(ppids: List[PreProTextDoc]) -> Any:
    return Signature(
        index_image_document_in_faiss, kwargs={"ppids": ppids}
    ).apply_async()


def find_similar_sentences_apply_async(
    proj_id: int, query: Union[str, Image], top_k: int = 10
) -> Any:
    return Signature(
        find_similar_sentences,
        kwargs={"proj_id": proj_id, "query": query, "top_k": top_k},
    ).apply_async()


def find_similar_images_apply_async(
    proj_id: int, query: Union[str, Image], top_k: int = 10
) -> Any:
    return Signature(
        find_similar_images, kwargs={"proj_id": proj_id, "query": query, "top_k": top_k}
    ).apply_async()
