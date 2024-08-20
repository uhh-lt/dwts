from typing import List, Tuple

import numpy as np
import weaviate
from loguru import logger

from app.core.data.dto.search import SimSearchImageHit, SimSearchSentenceHit
from app.core.search.index_type import IndexType
from app.core.search.vector_index_service import VectorIndexService
from config import conf


class WeaviateService(VectorIndexService):
    def __new__(cls, *args, **kwargs):
        cls._sentence_class_name = "Sentence"
        cls._image_class_name = "Image"
        cls._named_entity_class_name = "NamedEntity"
        cls._document_class_name = "Document"

        cls.class_names = {
            IndexType.SENTENCE: cls._sentence_class_name,
            IndexType.IMAGE: cls._image_class_name,
            IndexType.NAMED_ENTITY: cls._named_entity_class_name,
            IndexType.DOCUMENT: cls._document_class_name,
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

        cls._sentence_schema = {
            "name": cls._sentence_class_name,
            "fields": [
                {"name": "text", "type": "string"},
                {"name": "vec", "type": "float[]", "num_dim": 512},
                {"name": "project_id", "type": "int32"},
                {"name": "sdoc_id", "type": "int32"},
                {"name": "sentence_id", "type": "int32"},
            ],
        }

        cls._document_schema = {
            "name": cls._document_class_name,
            "fields": [
                {"name": "text", "type": "string"},
                {"name": "vec", "type": "float[]", "num_dim": 512},
                {"name": "project_id", "type": "int32"},
                {"name": "sdoc_id", "type": "int32"},
            ],
        }

        cls._named_entity_class_obj = {
            "class": cls._named_entity_class_name,
            "vectorizer": "none",
            "properties": [
                *cls._common_properties,
                {
                    "name": "span_id",
                    "description": "The id of this span annotation",
                    "dataType": ["int"],
                },
            ],
        }

        cls._document_class_obj = {
            "class": cls._document_class_name,
            "vectorizer": "none",
            "properties": [
                *cls._common_properties,
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
                if cls._client.schema.exists(cls._named_entity_class_name):
                    cls._client.schema.delete_class(cls._named_entity_class_name)
                if cls._client.schema.exists(cls._document_class_name):
                    cls._client.schema.delete_class(cls._document_class_name)

            # create classes
            if not cls._client.schema.exists(cls._sentence_class_name):
                logger.debug(f"Creating class {cls._sentence_class_obj}!")
                cls._client.schema.create_class(cls._sentence_class_obj)
            if not cls._client.schema.exists(cls._image_class_name):
                logger.debug(f"Creating class {cls._image_class_obj}!")
                cls._client.schema.create_class(cls._image_class_obj)
            if not cls._client.schema.exists(cls._named_entity_class_name):
                logger.debug(f"Creating class {cls._named_entity_class_obj}!")
                cls._client.schema.create_class(cls._named_entity_class_obj)
            if not cls._client.schema.exists(cls._document_class_name):
                logger.debug(f"Creating class {cls._document_class_obj}!")
                cls._client.schema.create_class(cls._document_class_obj)

            cls._sentence_props = list(
                map(lambda p: p["name"], cls._sentence_class_obj["properties"])
            )
            cls._image_props = list(
                map(lambda p: p["name"], cls._image_class_obj["properties"])
            )
            cls._named_entity_props = list(
                map(lambda p: p["name"], cls._named_entity_class_obj["properties"])
            )
        except Exception as e:
            msg = f"Cannot connect or initialize to Weaviate DB - Error '{e}'"
            logger.error(msg)
            raise SystemExit(msg)
        return super(WeaviateService, cls).__new__(cls)

    def add_embeddings_to_index(
        self, type: IndexType, proj_id: int, sdoc_id: int, embeddings: List[np.ndarray]
    ):
        logger.debug(
            f"Adding {type} SDoc {sdoc_id} in Project {proj_id} to Weaviate ..."
        )

        with self._client.batch as batch:
            for sent_id, sent_emb in enumerate(embeddings):
                batch.add_data_object(
                    data_object={
                        "project_id": proj_id,
                        "sdoc_id": sdoc_id,
                        "sentence_id": sent_id,
                    },
                    class_name=self.class_names[type],
                    vector=sent_emb,
                )

    def remove_embeddings_from_index(self, type: IndexType, sdoc_id: int):
        match type:
            case IndexType.SENTENCE:
                self.remove_text_sdoc_from_index(sdoc_id)
            case IndexType.IMAGE:
                self.remove_image_sdoc_from_index(sdoc_id)
            case _:
                pass

    def remove_text_sdoc_from_index(self, sdoc_id: int) -> None:
        logger.debug(f"Removing text SDoc {sdoc_id} from Weaviate!")
        id_filter = {
            "path": ["sdoc_id"],
            "operator": "Equal",
            "valueInt": sdoc_id,
        }
        self._client.batch.delete_objects(
            class_name=self._sentence_class_name,
            where=id_filter,
        )
        self._client.batch.delete_objects(
            class_name=self._named_entity_class_name,
            where=id_filter,
        )
        self._client.batch.delete_objects(
            class_name=self._document_class_name,
            where=id_filter,
        )

    def remove_image_sdoc_from_index(self, sdoc_id: int) -> None:
        logger.debug(f"Removing image SDoc {sdoc_id} from Weaviate!")
        obj_id = self._get_image_object_id_by_sdoc_id(sdoc_id=sdoc_id)
        self._client.data_object.delete(
            uuid=obj_id,
            class_name=self._image_class_name,
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

    def _get_named_entity_object_ids_by_sdoc_id(
        self,
        sdoc_id: int,
    ) -> List[str]:
        id_filter = {
            "path": ["sdoc_id"],
            "operator": "Equal",
            "valueInt": sdoc_id,
        }
        response = (
            self._client.query.get(self._named_entity_class_name, ["span_id"])
            .with_where(id_filter)
            .with_additional("id")
            .do()
        )
        if len(response["data"]["Get"][self._named_entity_class_name]) == 0:
            msg = f"No span annotation for SDoc {sdoc_id} found!"
            logger.error(msg)
            raise KeyError(msg)

        return list(
            map(
                lambda r: r["_additional"]["id"],
                response["data"]["Get"][self._named_entity_class_name],
            )
        )

    def remove_project_from_index(self, proj_id: int):
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

    def search_index(
        self,
        proj_id: int,
        index_type: IndexType,
        query_emb: np.ndarray,
        sdoc_ids_to_search: List[int],
        top_k: int = 10,
        threshold: float = 0.0,
    ) -> List[SimSearchSentenceHit] | List[SimSearchImageHit]:
        project_filter = {
            "path": ["project_id"],
            "operator": "Equal",
            "valueInt": proj_id,
        }
        if index_type == IndexType.SENTENCE:
            query = self._client.query.get(
                self._sentence_class_name,
                self._sentence_props,
            )
        elif index_type == IndexType.IMAGE:
            query = self._client.query.get(
                self._image_class_name,
                self._image_props,
            )
        elif index_type == IndexType.NAMED_ENTITY:
            query = self._client.query.get(
                self._named_entity_class_name,
                self._named_entity_props,
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
        if index_type == IndexType.SENTENCE:
            return [
                SimSearchSentenceHit(
                    sdoc_id=r["sdoc_id"],
                    sentence_id=r["sentence_id"],
                    score=r["_additional"]["certainty"],
                )
                for r in results
            ]
        else:
            return [
                SimSearchImageHit(
                    sdoc_id=r["sdoc_id"],
                    score=r["_additional"]["certainty"],
                )
                for r in results
            ]

    def suggest(
        self,
        index_type: IndexType,
        proj_id: int,
        sdoc_sent_ids: List[Tuple[int, int]],
    ) -> List[SimSearchSentenceHit]:
        obj_ids = [
            # TODO weaviate does not support batch/bulk queries.
            # need some other solution as this is dead-slow for many objects
            self._get_sentence_object_ids_by_sdoc_id_sentence_id(proj_id, sdoc, sent)
            for sdoc, sent in sdoc_sent_ids
        ]

        project_filter = {
            "path": ["project_id"],
            "operator": "Equal",
            "valueInt": proj_id,
        }

        hits: List[SimSearchSentenceHit] = []

        for obj in obj_ids:
            # TODO weaviate does not support batch/bulk queries.
            # need some other solution as this is dead-slow for many objects
            query = self._client.query.get(
                self._sentence_class_name,
                self._sentence_props,
            )

            query = (
                query.with_near_object({"id": obj})
                # query.with_near_object({"id": obj, "certainty": threshold})
                .with_additional(["certainty"])
                .with_where(project_filter)
                .with_limit(10)
            )

            res = query.do()["data"]["Get"][self._sentence_class_name]
            for r in res:
                hits.append(
                    SimSearchSentenceHit(
                        sdoc_id=r["sdoc_id"],
                        sentence_id=r["sentence_id"],
                        score=r["_additional"]["certainty"],
                    )
                )

    def _get_sentence_object_ids_by_sdoc_id_sentence_id(
        self,
        proj_id: int,
        sdoc_id: int,
        sentence_id: int,
    ) -> str:
        id_filter = {
            "operator": "And",
            "operands": [
                {
                    "path": ["project_id"],
                    "operator": "Equal",
                    "valueInt": proj_id,
                },
                {
                    "path": ["sdoc_id"],
                    "operator": "Equal",
                    "valueInt": sdoc_id,
                },
                {
                    "path": ["sentence_id"],
                    "operator": "Equal",
                    "valueInt": sentence_id,
                },
            ],
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

        return response["data"]["Get"][self._sentence_class_name][0]["_additional"][
            "id"
        ]
