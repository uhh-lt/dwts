import uuid
from typing import List, Tuple

import numpy as np
from loguru import logger
from qdrant_client import QdrantClient
from qdrant_client.conversions.common_types import PointStruct, VectorParams
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    FilterSelector,
    MatchAny,
    MatchValue,
    PointIdsList,
    RecommendRequest,
)

from app.core.data.dto.search import SimSearchImageHit, SimSearchSentenceHit
from app.core.db.index_type import IndexType
from app.core.db.vector_index_service import VectorIndexService
from config import conf


class QdrantService(VectorIndexService):
    def __new__(cls, *args, **kwargs):
        cls._colletions = list(IndexType)

        try:
            cls._client = QdrantClient(
                host=conf.qdrant.host,
                grpc_port=conf.qdrant.grpc_port,
                prefer_grpc=True,
            )
            collections = {c.name for c in cls._client.get_collections().collections}
            if kwargs["flush"] if "flush" in kwargs else False:
                logger.warning("Flushing Qdrant Data!")
                for c in collections:
                    cls._client.delete_collection(c)
                collections.clear()
            for name in cls._colletions:
                if name not in collections:
                    res = cls._client.create_collection(
                        name,
                        vectors_config=VectorParams(size=512, distance=Distance.COSINE),
                    )
                    print(res)

        except Exception as e:
            msg = f"Cannot connect or initialize to Qdrant DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)
        return super(QdrantService, cls).__new__(cls)

    def add_embeddings_to_index(
        self, type: IndexType, proj_id: int, sdoc_id: int, embeddings: List[np.ndarray]
    ):
        logger.debug(f"Adding {type} SDoc {sdoc_id} in Project {proj_id} to Qdrant ...")

        points = [
            PointStruct(
                id=(
                    self._sentence_uuid(sdoc_id, id)
                    if type == IndexType.SENTENCE
                    else sdoc_id
                ),
                vector=emb.tolist(),
                payload={
                    "project_id": proj_id,
                    "sdoc_id": sdoc_id,
                    "sentence_id": id,
                },
            )
            for id, emb in enumerate(embeddings)
        ]
        self._client.upsert(type, points)  # type: ignore

    def remove_embeddings_from_index(self, type: IndexType, sdoc_id: int):
        selector = (
            FilterSelector(
                filter=Filter(
                    must=[
                        FieldCondition(key="sdoc_id", match=MatchValue(value=sdoc_id))
                    ]
                )
            )
            if type == IndexType.SENTENCE
            else PointIdsList(points=[sdoc_id])
        )
        self._client.delete(type, points_selector=selector)

    def remove_project_from_index(self, proj_id: int):
        for name in self._colletions:
            self._client.delete(
                name,
                points_selector=FilterSelector(
                    filter=Filter(
                        must=[
                            FieldCondition(
                                key="proj_id", match=MatchValue(value=proj_id)
                            )
                        ]
                    )
                ),
            )

    def search_index(
        self,
        proj_id: int,
        index_type: IndexType,
        query_emb: np.ndarray,
        sdoc_ids_to_search: List[int],
        top_k: int = 10,
        threshold: float = 0.0,
    ) -> List[SimSearchSentenceHit] | List[SimSearchImageHit]:
        filter = Filter(
            must=[
                FieldCondition(key="proj_id", match=MatchValue(value=proj_id)),
                FieldCondition(key="sdoc_id", match=MatchAny(any=sdoc_ids_to_search)),
            ]
        )
        res = self._client.search(
            index_type,
            query_vector=query_emb,
            query_filter=filter,
            score_threshold=threshold,
            limit=top_k,
            with_payload=True,
        )
        if index_type == IndexType.IMAGE:
            return [
                SimSearchImageHit(
                    sdoc_id=hit.payload.sdoc_id,  # type: ignore
                    score=hit.score,
                )
                for hit in res
            ]
        else:
            return [
                SimSearchSentenceHit(
                    sdoc_id=hit.payload.sdoc_id,  # type: ignore
                    sentence_id=hit.payload.sentence_id,  # type: ignore
                    score=hit.score,
                )
                for hit in res
            ]

    def suggest(
        self,
        sdoc_sent_ids: List[Tuple[int, int]],
        proj_id: int,
        index_type: IndexType,
    ) -> List[SimSearchSentenceHit]:
        filter = Filter(
            must=[FieldCondition(key="proj_id", match=MatchValue(value=proj_id))]
        )
        # TODO check if directly providing multiple points to a single request works as well
        req = [
            RecommendRequest(
                filter=filter,
                limit=1,
                with_payload=True,
                positive=[self._sentence_uuid(sdoc_id, sent_id)],
            )
            for sdoc_id, sent_id in sdoc_sent_ids
        ]
        res = self._client.recommend_batch(index_type, req)

        return [
            SimSearchSentenceHit(
                sdoc_id=r[0].payload.sdoc_id,  # type: ignore
                score=r[0].score,
                sentence_id=r[0].payload.sentence_id,  # type: ignore
            )
            for r in res
        ]

    def get_sentence_embeddings(self, search_tuples: List[Tuple[int]]) -> np.ndarray:
        # TODO implement
        raise NotImplementedError("get_sentence_embeddings not implemented for qdrant")

    def drop_indices(self) -> None:
        # TODO implement
        raise NotImplementedError("drop_indices not implemented for qdrant")

    def _sentence_uuid(self, sdoc_id: int, id: int):
        return str(uuid.UUID(int=(sdoc_id << 64) + id))
