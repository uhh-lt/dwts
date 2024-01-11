from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import weaviate
from loguru import logger

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.doc_type import DocType
from app.core.data.dto.search import (
    SimSearchImageHit,
    SimSearchQuery,
    SimSearchSentenceHit,
)
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.repo.repo_service import RepoService
from app.core.db.sql_service import SQLService
from app.core.search.index_type import IndexType
from app.preprocessing.ray_model_service import RayModelService
from app.preprocessing.ray_model_worker.dto.clip import (
    ClipImageEmbeddingInput,
    ClipTextEmbeddingInput,
)
from app.util.singleton_meta import SingletonMeta
from config import conf


class SimSearchService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls._sentence_class_name = "Sentence"
        cls._image_class_name = "Image"

        cls.class_names = {
            IndexType.TEXT: cls._sentence_class_name,
            IndexType.IMAGE: cls._image_class_name,
        }

        cls._common_properties = [
            {
                "name": "project_id",
                "description": "The id of the project this sentence belongs to",
                "dataType": ["int"],
            },
            {
                "name": "sdoc_id",
                "description": "The sdoc id of this image",
                "dataType": ["int"],
            },
        ]

        cls._sentence_class_obj = {
            "class": cls._sentence_class_name,
            "vectorizer": "none",
            "properties": [
                *cls._common_properties,
                {
                    "name": "sentence_id",
                    "description": "The id of this sentence",
                    "dataType": ["int"],
                },
            ],
        }

        cls._image_class_obj = {
            "class": cls._image_class_name,
            "vectorizer": "none",
            "properties": [
                *cls._common_properties,
            ],
        }

        try:
            # setup weaviate client
            w_host = conf.weaviate.host
            w_port = conf.weaviate.port
            url = f"http://{w_host}:{w_port}"
            cls._client = weaviate.Client(url)

            if not cls._client.is_ready():
                msg = f"Weaviate client at {url} not ready!"
                logger.error(msg)
                raise RuntimeError(msg)

            cls._client.batch.configure(
                batch_size=100,
                num_workers=2,
            )

            if kwargs["flush"] if "flush" in kwargs else False:
                logger.warning("Flushing DWTS Weaviate Data!")
                if cls._client.schema.exists(cls._sentence_class_name):
                    cls._client.schema.delete_class(cls._sentence_class_name)
                if cls._client.schema.exists(cls._image_class_name):
                    cls._client.schema.delete_class(cls._image_class_name)

            # create classes
            if not cls._client.schema.exists(cls._sentence_class_name):
                logger.debug(f"Creating class {cls._sentence_class_obj}!")
                cls._client.schema.create_class(cls._sentence_class_obj)
            if not cls._client.schema.exists(cls._image_class_name):
                logger.debug(f"Creating class {cls._image_class_obj}!")
                cls._client.schema.create_class(cls._image_class_obj)

            cls._sentence_props = list(
                map(lambda p: p["name"], cls._sentence_class_obj["properties"])
            )
            cls._image_props = list(
                map(lambda p: p["name"], cls._image_class_obj["properties"])
            )
        except Exception as e:
            msg = f"Cannot connect or initialize to Weaviate DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)

        cls.rms = RayModelService()
        cls.repo = RepoService()
        cls.sqls = SQLService()

        return super(SimSearchService, cls).__new__(cls)

    def _encode_text(
        self, text: Union[str, List[str]], return_avg_emb: bool = False
    ) -> np.ndarray:
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
            str(query_image_path).replace(conf.repo.root_directory, "/tmp/dwts")
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
        sentence_embs = (
            self.rms.clip_text_embedding(ClipTextEmbeddingInput(text=sentences))
            .numpy()
            .tolist()
        )
        logger.debug(
            f"Adding {len(sentence_embs)} sentences "
            f"from SDoc {sdoc_id} in Project {proj_id} to Weaviate ..."
        )
        with self._client.batch as batch:
            for sent_id, sent_emb in enumerate(sentence_embs):
                batch.add_data_object(
                    data_object={
                        "project_id": proj_id,
                        "sdoc_id": sdoc_id,
                        "sentence_id": sent_id,
                    },
                    class_name=self._sentence_class_name,
                    vector=sent_emb,
                )

    def add_image_sdoc_to_index(
        self,
        proj_id: int,
        sdoc_id: int,
    ) -> None:
        image_emb = self._encode_image(image_sdoc_id=sdoc_id)
        logger.debug(
            f"Adding image SDoc {sdoc_id} in Project {proj_id} to Weaviate ..."
        )
        with self._client.batch as batch:
            batch.add_data_object(
                data_object={
                    "project_id": proj_id,
                    "sdoc_id": sdoc_id,
                },
                class_name=self._image_class_name,
                vector=image_emb,
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

    def remove_image_sdoc_from_index(
        self,
        sdoc_id: int,
    ) -> None:
        logger.debug(f"Removing image SDoc {sdoc_id} from Index!")
        obj_id = self._get_image_object_id_by_sdoc_id(sdoc_id=sdoc_id)
        self._client.data_object.delete(
            uuid=obj_id,
            class_name=self._image_class_name,
        )

    def remove_text_sdoc_from_index(
        self,
        sdoc_id: int,
    ) -> None:
        obj_ids = self._get_sentence_object_ids_by_sdoc_id(sdoc_id=sdoc_id)
        logger.debug(
            f"Removing text SDoc {sdoc_id} with {len(obj_ids)} sentences from Index!"
        )
        for obj_id in obj_ids:
            self._client.data_object.delete(
                uuid=obj_id,
                class_name=self._sentence_class_name,
            )

    def remove_all_project_embeddings(
        self,
        proj_id: int,
    ) -> None:
        for class_name in self.class_names.values():
            logger.debug(f"Removing all {class_name} embeddings of Project {proj_id}!")

            self._client.batch.delete_objects(
                class_name=class_name,
                where={
                    "path": ["project_id"],
                    "operator": "Equal",
                    "valueInt": proj_id,
                },
            )

    def _get_image_object_id_by_sdoc_id(
        self,
        sdoc_id: int,
    ) -> str:
        id_filter = {
            "path": ["sdoc_id"],
            "operator": "Equal",
            "valueInt": sdoc_id,
        }
        response = (
            self._client.query.get(self.class_names[IndexType.IMAGE], ["sdoc_id"])
            .with_where(id_filter)
            .with_additional("id")
            .do()
        )
        if len(response["data"]["Get"][self.class_names[IndexType.IMAGE]]) == 0:
            msg = f"No Sentence with sentence_id {sdoc_id} found!"
            logger.error(msg)
            raise KeyError(msg)

        return response["data"]["Get"][self.class_names[IndexType.IMAGE]][0][
            "_additional"
        ]["id"]

    def _get_sentence_object_ids_by_sdoc_id(
        self,
        sdoc_id: int,
    ) -> List[str]:
        id_filter = {
            "path": ["sdoc_id"],
            "operator": "Equal",
            "valueInt": sdoc_id,
        }
        response = (
            self._client.query.get(self._sentence_class_name, ["sentence_id"])
            .with_where(id_filter)
            .with_additional("id")
            .do()
        )
        if len(response["data"]["Get"][self._sentence_class_name]) == 0:
            msg = f"No Sentences for SDoc {sdoc_id} found!"
            logger.error(msg)
            raise KeyError(msg)

        return list(
            map(
                lambda r: r["_additional"]["id"],
                response["data"]["Get"][self._sentence_class_name],
            )
        )

    def __search_index(
        self,
        proj_id: int,
        index_type: IndexType,
        query_emb: np.ndarray,
        sdoc_ids_to_search: List[int],
        top_k: int = 10,
        threshold: float = 0.0,
    ) -> List[Dict[str, Any]]:
        project_filter = {
            "path": ["project_id"],
            "operator": "Equal",
            "valueInt": proj_id,
        }
        if index_type == IndexType.TEXT:
            query = self._client.query.get(
                self._sentence_class_name,
                self._sentence_props,
            )
        elif index_type == IndexType.IMAGE:
            query = self._client.query.get(
                self._image_class_name,
                self._image_props,
            )
        else:
            msg = f"Unknown IndexType '{index_type}'!"
            logger.error(msg)
            raise ValueError(msg)

        query = (
            query.with_near_vector(
                {"vector": query_emb.tolist(), "certainty": threshold}
            )
            .with_additional(["certainty"])
            .with_where(project_filter)
            .with_limit(top_k)
        )

        query.with_where(
            {
                "operator": "ContainsAny",
                "path": "sdoc_id",
                "valueInt": sdoc_ids_to_search,
            }
        )

        results = query.do()["data"]["Get"][self.class_names[index_type]]
        if results is None:
            results = []
        return results

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
        self, sdoc_ids_to_search: List[int], query: SimSearchQuery
    ) -> List[SimSearchSentenceHit]:
        query_emb = self._encode_query(
            **self.__parse_query_param(query.query),
        )
        results = self.__search_index(
            proj_id=query.proj_id,
            index_type=IndexType.TEXT,
            query_emb=query_emb,
            top_k=query.top_k,
            threshold=query.threshold,
            sdoc_ids_to_search=sdoc_ids_to_search,
        )
        return [
            SimSearchSentenceHit(
                sdoc_id=r["sdoc_id"],
                sentence_id=r["sentence_id"],
                score=r["_additional"]["certainty"],
            )
            for r in results
        ]

    def find_similar_images(
        self, sdoc_ids_to_search: List[int], query: SimSearchQuery
    ) -> List[SimSearchImageHit]:
        query_emb = self._encode_query(
            **self.__parse_query_param(query.query),
        )
        results = self.__search_index(
            proj_id=query.proj_id,
            index_type=IndexType.IMAGE,
            query_emb=query_emb,
            top_k=query.top_k,
            threshold=query.threshold,
            sdoc_ids_to_search=sdoc_ids_to_search,
        )
        return [
            SimSearchImageHit(
                sdoc_id=r["sdoc_id"],
                score=r["_additional"]["certainty"],
            )
            for r in results
        ]

    def _get_num_of_objects_in_index(self, index_type: IndexType) -> int:
        return (
            self._client.query.aggregate(self.class_names[index_type]).with_meta_count()
        ).do()["data"]["Aggregate"][self.class_names[index_type]][0]["meta"]["count"]

    def get_sentence_embeddings(
        self, search_tuples: List[Tuple[int, int]]
    ) -> List[List[float]]:
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
            return [r["_additional"]["vector"] for r in result]

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

        return embeddings
