from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import DocType
from app.core.data.dto.search import SimSearchImageHit, SimSearchSentenceHit
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.repo.repo_service import RepoService
from app.core.db.index_type import IndexType
from app.core.db.sql_service import SQLService
from app.core.search.index_type import IndexType
from app.core.search.vector_index_service import VectorIndexService
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.clip import (
    ClipImageEmbeddingInput, ClipTextEmbeddingInput)
from app.util.singleton_meta import SingletonMeta
from config import conf
from loguru import logger


class SimSearchService(metaclass=SingletonMeta):
    def __new__(cls, reset_vector_index=False):
        index_name: str = conf.vector_index.service
        match index_name:
            case "qdrant":
                # import and init QdrantService
                from app.core.search.qdrant_service import QdrantService

                cls._index: VectorIndexService = QdrantService(flush=reset_vector_index)
            case "typesense":
                # import and init TypesenseService
                from app.core.search.typesense_service import TypesenseService

                cls._index: VectorIndexService = TypesenseService(
                    flush=reset_vector_index
                )
            case "weaviate":
                # import and init WeaviateService
                from app.core.search.weaviate_service import WeaviateService

                cls._index: VectorIndexService = WeaviateService(
                    flush=reset_vector_index
                )
            case _:
                msg = (
                    f"VECTOR_INDEX environment variable not correctly set: {index_name}"
                )
                logger.error(msg)
                raise SystemExit(msg)
        cls.rms = RayModelService()
        cls.repo = RepoService()
        cls.sqls = SQLService()
        return super(SimSearchService, cls).__new__(cls)

    def _encode_text(self, text: List[str], return_avg_emb: bool = False) -> np.ndarray:
        encoded_query = self.rms.clip_text_embedding(ClipTextEmbeddingInput(text=text))
        if len(encoded_query.embeddings) == 1:
            return encoded_query.numpy().squeeze()
        elif len(encoded_query.embeddings) > 1 and return_avg_emb:
            # average embeddings
            query_emb: np.ndarray = encoded_query.numpy().mean(axis=0)
            # normalize averaged embedding
            query_emb: np.ndarray = query_emb / np.linalg.norm(query_emb)
            return query_emb
        else:
            return encoded_query.numpy()

    def _get_image_path_from_sdoc_id(self, sdoc_id: int) -> Path:
        with self.sqls.db_session() as db:
            sdoc = SourceDocumentRead.model_validate(crud_sdoc.read(db=db, id=sdoc_id))
            assert (
                sdoc.doctype == DocType.image
            ), f"SourceDocument with {sdoc_id=} is not an image!"
        return self.repo.get_path_to_sdoc_file(sdoc=sdoc, raise_if_not_exists=True)

    def _encode_image(self, image_sdoc_id: int) -> np.ndarray:
        query_image_path = self._get_image_path_from_sdoc_id(sdoc_id=image_sdoc_id)
        # FIXME HACK FOR LOCAL RUN
        query_image_path = Path(
            str(query_image_path).replace(conf.repo.root_directory, "/tmp/dats")
        )

        encoded_query = self.rms.clip_image_embedding(
            ClipImageEmbeddingInput(image_fps=[str(query_image_path)])
        )
        return encoded_query.numpy().squeeze()

    def add_text_sdoc_to_index(
        self,
        proj_id: int,
        sdoc_id: int,
        sentences: List[str],
    ) -> None:
        sentence_embs = self.rms.clip_text_embedding(
            ClipTextEmbeddingInput(text=sentences)
        ).numpy()

        # create cheap&easy (but suboptimal) document embeddings for now
        doc_emb = sentence_embs.sum(axis=0)
        doc_emb /= np.linalg.norm(doc_emb)

        logger.debug(
            f"Adding {len(sentence_embs)} sentences "
            f"from SDoc {sdoc_id} in Project {proj_id} to Weaviate ..."
        )
        self._index.add_embeddings_to_index(
            IndexType.DOCUMENT, proj_id, sdoc_id, [doc_emb]
        )
        self._index.add_embeddings_to_index(
            IndexType.SENTENCE, proj_id, sdoc_id, sentence_embs
        )

    def add_image_sdoc_to_index(self, proj_id: int, sdoc_id: int) -> None:
        image_emb = self._encode_image(image_sdoc_id=sdoc_id)
        logger.debug(
            f"Adding image SDoc {sdoc_id} in Project {proj_id} to Weaviate ..."
        )
        self._index.add_embeddings_to_index(
            IndexType.IMAGE, proj_id, sdoc_id, [image_emb]
        )

    def remove_sdoc_from_index(self, doctype: str, sdoc_id: int):
        match doctype:
            case DocType.text:
                self.remove_text_sdoc_from_index(sdoc_id)
            case DocType.image:
                self.remove_image_sdoc_from_index(sdoc_id)
            case _:
                # Other doctypes are not used for simsearch
                pass

    def remove_image_sdoc_from_index(self, sdoc_id: int) -> None:
        logger.debug(f"Removing image SDoc {sdoc_id} from Index!")
        self._index.remove_embeddings_from_index(IndexType.IMAGE, sdoc_id)

    def remove_text_sdoc_from_index(self, sdoc_id: int) -> None:
        logger.debug(f"Removing text SDoc {sdoc_id} from Index!")
        self._index.remove_embeddings_from_index(IndexType.SENTENCE, sdoc_id)
        self._index.remove_embeddings_from_index(IndexType.DOCUMENT, sdoc_id)

    def remove_all_project_embeddings(
        self,
        proj_id: int,
    ) -> None:
        self._index.remove_project_from_index(proj_id)

    def _encode_query(
        self,
        text_query: Optional[List[str]] = None,
        image_query_id: Optional[int] = None,
        average_text_query: bool = False,
    ) -> np.ndarray:
        if text_query is None and image_query_id is None:
            msg = "Either text_query or image_query must be set!"
            logger.error(msg)
            raise ValueError(msg)
        elif text_query is not None and image_query_id is not None:
            msg = "Only one of text_query or image_query must be set!"
            logger.error(msg)
            raise ValueError(msg)
        elif text_query is not None:
            query_emb = self._encode_text(
                text=text_query, return_avg_emb=average_text_query
            )
        elif image_query_id is not None:
            query_emb = self._encode_image(image_sdoc_id=image_query_id)
        else:
            msg = "This should never happend! Unknown Error!"
            logger.error(msg)
            raise ValueError(msg)
        return query_emb

    def __parse_query_param(self, query: Union[str, List[str], int]) -> Dict[str, Any]:
        query_params = {
            "text_query": None,
            "image_query_id": None,
            "average_text_query": False,
        }

        if isinstance(query, int) or (isinstance(query, str) and query.isdigit()):
            query_params["image_query_id"] = int(query)
        elif isinstance(query, str) and not query.isdigit():
            query_params["text_query"] = [query]
        elif isinstance(query, list):
            query_params["text_query"] = query
            query_params["average_text_query"] = True

        return query_params

    def find_similar_sentences(
        self,
        proj_id: int,
        query: Union[str, List[str], int],
        top_k: int,
        threshold: float,
        sdoc_ids_to_search: Optional[List[int]] = None,
    ) -> List[SimSearchSentenceHit]:
        return self.find_similar(IndexType.SENTENCE, sdoc_ids_to_search, query)

    def find_similar_images(
        self,
        sdoc_ids_to_search: List[int],
        proj_id: int,
        query: Union[str, List[str], int],
        top_k: int,
        threshold: float,
    ) -> List[SimSearchImageHit]:
        return self.find_similar(IndexType.IMAGE, sdoc_ids_to_search, query)

    def find_similar(
        self,
        index_type: IndexType,
        sdoc_ids_to_search: List[int],
        query: SimSearchQuery,
    ) -> List[SimSearchSentenceHit] | List[SimSearchImageHit]:
        query_emb = self._encode_query(
            **self.__parse_query_param(query),
        )
        return self._index.search_index(
            proj_id=query.proj_id,
            index_type=index_type,
            query_emb=query_emb,
            top_k=top_k,
            threshold=threshold,
            sdoc_ids_to_search=sdoc_ids_to_search,
        )

    def suggest_similar_sentences(
        self,
        proj_id: int,
        sdoc_sent_ids: List[Tuple[int, int]],
        top_k: int,
    ) -> List[SimSearchSentenceHit]:
        hits = self._index.suggest(IndexType.SENTENCE, proj_id, sdoc_sent_ids)
        hits = [h for h in hits if (h.sdoc_id, h.sentence_id) not in sdoc_sent_ids]
        hits.sort(key=lambda x: (x.sdoc_id, x.sentence_id))
        hits = self.__unique_consecutive(hits)
        hits.sort(key=lambda x: x.score, reverse=True)
        return hits[0 : min(len(hits), top_k)]

    def __unique_consecutive(self, hits: List[SimSearchSentenceHit]):
        result = []
        current = SimSearchSentenceHit(sdoc_id=-1, sentence_id=-1, score=0.0)
        for hit in hits:
            if hit.sdoc_id != current.sdoc_id or hit.sentence_id != current.sentence_id:
                current = hit
                result.append(hit)
        return result

    def get_sentence_embeddings(
        self, search_tuples: List[Tuple[int, int]]
    ) -> np.ndarray:
        # First prepare the query to run through data
        def run_batch(batch):
            query = (
                self._client.query.get(
                    self._sentence_class_name,
                    self._sentence_props,
                )
                .with_additional(["vector"])
                .with_where(
                    {
                        "operator": "Or",
                        "operands": [
                            {
                                "operator": "And",
                                "operands": [
                                    {
                                        "path": ["sentence_id"],
                                        "operator": "Equal",
                                        "valueInt": sentence_id,
                                    },
                                    {
                                        "path": ["sdoc_id"],
                                        "operator": "Equal",
                                        "valueInt": sdoc_id,
                                    },
                                ],
                            }
                            for sentence_id, sdoc_id in batch
                        ],
                    }
                )
            )
            result = query.do()["data"]["Get"][self._sentence_class_name]
            result_dict = {
                f'{r["sdoc_id"]}-{r["sentence_id"]}': r["_additional"]["vector"]
                for r in result
            }
            sorted_res = []
            for sentence_id, sdoc_id in batch:
                sorted_res.append(result_dict[f"{sdoc_id}-{sentence_id}"])
            return sorted_res

        embeddings = []
        batch = search_tuples
        while True:
            if len(batch) >= 100:
                minibatch = batch[:100]
                batch = batch[100:]
            else:
                minibatch = batch
                batch = []

            # Get the next batch of objects
            embeddings_minibatch = run_batch(minibatch)
            embeddings.extend(embeddings_minibatch)

            if len(batch) == 0:
                break

        return np.array(embeddings)
