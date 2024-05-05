from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Union

import srsly
from elasticsearch import Elasticsearch, helpers
from loguru import logger
from omegaconf import OmegaConf

from app.core.data.dto.memo import MemoRead
from app.core.data.dto.search import (
    ElasticMemoHit,
    ElasticSearchDocumentCreate,
    ElasticSearchDocumentHit,
    ElasticSearchDocumentRead,
    ElasticSearchMemoCreate,
    ElasticSearchMemoRead,
    ElasticSearchMemoUpdate,
    PaginatedElasticSearchDocumentHits,
    PaginatedMemoSearchResults,
)
from app.util.singleton_meta import SingletonMeta
from config import conf


class NoSuchSourceDocumentInElasticSearchError(Exception):
    def __init__(self, proj_id: int, sdoc_id: int):
        super().__init__(
            (
                f"There exists no SourceDocument with ID={sdoc_id} in Project {proj_id}"
                " in the respective ElasticSearch Index!"
            )
        )


class NoSuchMemoInElasticSearchError(Exception):
    def __init__(self, proj_id: int, memo_id: int):
        super().__init__(
            (
                f"There exists no Memo with ID={memo_id} in Project {proj_id}"
                " in the respective ElasticSearch Index!"
            )
        )


class NoSuchFieldInIndexError(Exception):
    def __init__(self, index: str, fields: set, index_fields: set):
        super().__init__(
            (
                f"The following field(s) do not exist in the ElasticSearch index: {index}:"
                f" {fields.difference(index_fields)}"
            )
        )


class ElasticSearchService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        try:
            memo_mappings_path = Path(conf.elasticsearch.index_mappings.memos)
            doc_mappings_path = Path(conf.elasticsearch.index_mappings.docs)
            if not memo_mappings_path.exists():
                raise FileNotFoundError(
                    f"Cannot find ElasticSearch Memo Index Mapping: {memo_mappings_path}"
                )
            elif not doc_mappings_path.exists():
                raise FileNotFoundError(
                    f"Cannot find ElasticSearch Document Index Mapping: {doc_mappings_path}"
                )

            memo_mappings = srsly.read_json(memo_mappings_path)
            doc_mappings = srsly.read_json(doc_mappings_path)

            cls.doc_index_fields = set(doc_mappings["properties"].keys())
            cls.memo_index_fields = set(memo_mappings["properties"].keys())

            cls.doc_mappings = doc_mappings
            cls.memo_mappings = memo_mappings

            # ElasticSearch Connection
            esc = Elasticsearch(
                [
                    {
                        "host": conf.elasticsearch.host,
                        "port": conf.elasticsearch.port,
                    }
                ],
                use_ssl=conf.elasticsearch.use_ssl,
                verify_certs=conf.elasticsearch.verify_certs,
                retry_on_timeout=True,
                maxsize=25,
                # DO NOT SNIFF WHEN ES IS NOT IN LOCAL NETWORK! This will cause timeout errors
                # sniff before doing anything
                sniff_on_start=conf.elasticsearch.sniff_on_start,
                sniff_on_connection_fail=conf.elasticsearch.sniff_on_connection_fail,
                sniffer_timeout=conf.elasticsearch.sniffer_timeout,
            )
            if not esc.ping():
                raise Exception(
                    f"Cant connect to ElasticSearch on {conf.elasticsearch.host}:{conf.elasticsearch.port}"
                )

            cls.__client = esc

        except Exception as e:
            msg = f"Cannot instantiate ElasticSearchService - Error '{e}'"
            logger.error(msg)
            # TODO Flo: do we really want to exit here?
            raise SystemExit(msg)

        logger.info("Successfully established connection to ElasticSearch!")

        if kwargs["remove_all_indices"] if "remove_all_indices" in kwargs else False:
            logger.warning("Removing all DWTS ElasticSearch indices!")
            esc.indices.delete(index="dwts_*", allow_no_indices=True)

        return super(ElasticSearchService, cls).__new__(cls)

    def __delete_index(self, *, index: str) -> None:
        if self.__client.indices.exists(index=index):
            self.__client.indices.delete(index=index)
            logger.info(f"Removed ElasticSearch Index '{index}'!")
        else:
            logger.info(
                f"Cannot remove ElasticSearch Index '{index}' since it does not exist!"
            )

    def __create_index(
        self,
        *,
        index: str,
        mappings: Dict[str, Any],
        settings: Dict[str, Any] = None,
        replace_if_exists: bool = False,
    ) -> None:
        if replace_if_exists and self.__client.indices.exists(index=index):
            self.__delete_index(index=index)
        if not self.__client.indices.exists(index=index):
            self.__client.indices.create(
                index=index, mappings=mappings, settings=settings
            )
            logger.info(
                f"Created ElasticSearch Index '{index}' with Mappings: {mappings} and Settings: {settings}!"
            )

    def __get_index_name(self, proj_id: int, index_type: str = "doc") -> str:
        if "doc" in index_type:
            return f"dwts_project_{proj_id}_docs"
        elif "memo" in index_type:
            return f"dwts_project_{proj_id}_memos"
        else:
            raise NotImplementedError("Only Document and Memo indices exist!")

    def create_project_indices(self, *, proj_id: int) -> None:
        # create the ES Index for Documents
        doc_settings = conf.elasticsearch.index_settings.docs
        if doc_settings is not None:
            doc_settings = srsly.read_json(doc_settings)

        self.__create_index(
            index=self.__get_index_name(proj_id=proj_id, index_type="doc"),
            mappings=self.doc_mappings,
            settings=doc_settings,
            replace_if_exists=True,
        )

        # create the ES Index for Memos
        memo_settings = conf.elasticsearch.index_settings.memos
        if memo_settings is not None:
            memo_settings = srsly.read_json(memo_settings)
        self.__create_index(
            index=self.__get_index_name(proj_id=proj_id, index_type="memo"),
            mappings=self.memo_mappings,
            settings=memo_settings,
            replace_if_exists=True,
        )

    def remove_project_indices(self, *, proj_id: int) -> None:
        self.__delete_index(
            index=self.__get_index_name(proj_id=proj_id, index_type="doc")
        )
        self.__delete_index(
            index=self.__get_index_name(proj_id=proj_id, index_type="memo")
        )

    def add_document_to_index(
        self, *, proj_id: int, esdoc: ElasticSearchDocumentCreate
    ) -> int:
        # TODO Flo: what to do when this fails!? How to keep the SQL and ES consistent
        res = self.__client.index(
            index=self.__get_index_name(proj_id=proj_id, index_type="doc"),
            id=str(esdoc.sdoc_id),
            document=esdoc.model_dump_json(),
        )
        if not int(res["_id"]) == esdoc.sdoc_id:
            # FIXME Flo: What to do?!
            logger.warning(
                (
                    f"ElasticSearch Document ID {int(res['_id'])} and SQL Document ID {esdoc.sdoc_id} "
                    f"of Document '{esdoc.filename}' do not match!"
                )
            )

        logger.debug(
            (
                f"Added Document '{esdoc.filename}' with ID '{res['_id']}' to "
                f"Index '{self.__get_index_name(proj_id=proj_id, index_type='doc')}'!"
            )
        )
        return res["_id"]

    def bulk_add_documents_to_index(
        self, *, proj_id: int, esdocs: List[ElasticSearchDocumentCreate]
    ) -> int:
        idx_name = self.__get_index_name(proj_id=proj_id, index_type="doc")

        def generate_actions_for_bulk_index():
            for esdoc in esdocs:
                doc = {
                    "_index": idx_name,
                    "_id": esdoc.sdoc_id,
                    "_source": esdoc.model_dump(),
                }
                yield doc

        num_indexed, num_errors = helpers.bulk(
            client=self.__client,
            actions=generate_actions_for_bulk_index(),
            stats_only=True,
        )
        logger.debug(
            f"Added {num_indexed} Documents to ElasticSearch Index {idx_name} with {num_errors} Errors!"
        )
        return num_indexed

    def get_esdocs_by_sdoc_ids(
        self, *, proj_id: int, sdoc_ids: Set[int], fields: Set[str]
    ) -> List[ElasticSearchDocumentRead]:
        if not fields.union(self.doc_index_fields):
            raise NoSuchFieldInIndexError(
                index=self.__get_index_name(proj_id=proj_id, index_type="doc"),
                fields=fields,
                index_fields=self.doc_index_fields,
            )
        results = self.__client.mget(
            index=self.__get_index_name(proj_id=proj_id, index_type="doc"),
            _source=list(fields),
            body={"ids": list(sdoc_ids)},
        )

        esdocs = []
        for res in results["docs"]:
            if not res["found"]:
                raise NoSuchSourceDocumentInElasticSearchError(
                    proj_id=proj_id, sdoc_id=res["_id"]
                )
            esdocs.append(
                ElasticSearchDocumentRead(sdoc_id=res["_id"], **res["_source"])
            )

        return esdocs

    def get_esdoc_by_sdoc_id(
        self, *, proj_id: int, sdoc_id: int, fields: Set[str]
    ) -> Optional[ElasticSearchDocumentRead]:
        if not fields.union(self.doc_index_fields):
            raise NoSuchFieldInIndexError(
                index=self.__get_index_name(proj_id=proj_id, index_type="doc"),
                fields=fields,
                index_fields=self.doc_index_fields,
            )
        res = self.__client.get(
            index=self.__get_index_name(proj_id=proj_id, index_type="doc"),
            id=str(sdoc_id),
            _source=list(fields),
        )
        if not res["found"]:
            raise NoSuchSourceDocumentInElasticSearchError(
                proj_id=proj_id, sdoc_id=sdoc_id
            )
        return ElasticSearchDocumentRead(**res["_source"])

    def delete_document_from_index(self, proj_id: int, sdoc_id: int) -> None:
        self.__client.delete(
            index=self.__get_index_name(proj_id=proj_id, index_type="doc"),
            id=str(sdoc_id),
        )
        logger.info(
            f"Deleted Document with ID={sdoc_id} from Index '{self.__get_index_name(proj_id=proj_id, index_type='doc')}'!"
        )

    def add_memo_to_index(self, proj_id: int, esmemo: ElasticSearchMemoCreate) -> int:
        res = self.__client.index(
            index=self.__get_index_name(proj_id=proj_id, index_type="memo"),
            id=str(esmemo.memo_id),
            document=esmemo.model_dump_json(),
        )
        if not int(res["_id"]) == esmemo.memo_id:
            # FIXME Flo: What to do?!
            logger.error(
                f"ElasticSearch Memo ID and SQL Memo ID of Memo {esmemo.title} do not match!"
            )
        logger.debug(
            f"Added Memo '{esmemo.title}' with ID '{res['_id']}' to Index '{self.__get_index_name(proj_id=proj_id, index_type='doc')}'!"
        )
        return res["_id"]

    def get_esmemo_by_memo_id(
        self, *, proj_id: int, memo_id: int, fields: Optional[Set[str]] = None
    ) -> Optional[ElasticSearchMemoRead]:
        if fields is not None and not fields.union(self.doc_index_fields):
            raise NoSuchFieldInIndexError(
                index=self.__get_index_name(proj_id=proj_id, index_type="doc"),
                fields=fields,
                index_fields=self.doc_index_fields,
            )
        elif fields is None:
            fields = set()

        res = self.__client.get(
            index=self.__get_index_name(proj_id=proj_id, index_type="memo"),
            id=str(memo_id),
            _source=list(fields),
        )
        if not res["found"]:
            raise NoSuchMemoInElasticSearchError(proj_id=proj_id, memo_id=memo_id)

        return ElasticSearchMemoRead(**res["_source"])

    def delete_memo_from_index(self, *, proj_id: int, memo_id: int) -> None:
        self.__client.delete(
            index=self.__get_index_name(proj_id=proj_id, index_type="memo"),
            id=str(memo_id),
        )
        logger.info(
            f"Deleted Memo with ID={memo_id} from Index '{self.__get_index_name(proj_id=proj_id, index_type='memo')}'!"
        )

    def update_memo_in_index(
        self, *, proj_id: int, update: ElasticSearchMemoUpdate
    ) -> Optional[ElasticSearchMemoRead]:
        memo_id = update.memo_id
        old_memo = self.get_esmemo_by_memo_id(proj_id=proj_id, memo_id=memo_id)
        if old_memo is None:
            raise NoSuchMemoInElasticSearchError(proj_id=proj_id, memo_id=memo_id)

        update_data = {
            k: v
            for k, v in update.model_dump(exclude={"memo_id"}).items()
            if v is not None
        }

        self.__client.update(
            index=self.__get_index_name(proj_id=proj_id, index_type="memo"),
            id=str(memo_id),
            body={"doc": update_data},
        )

        logger.info(
            (
                f"Updated Memo '{memo_id}' in Index "
                f"'{self.__get_index_name(proj_id=proj_id, index_type='doc')}'!"
            )
        )
        return self.get_esmemo_by_memo_id(proj_id=proj_id, memo_id=memo_id)

    def __search(
        self,
        *,
        sdoc: bool = True,
        source_fields: Union[bool, List[str]] = False,
        proj_id: int,
        query: Dict[str, Any],
        limit: Optional[int] = None,
        skip: Optional[int] = None,
        highlight: Optional[Dict[str, Any]],
    ) -> list[ElasticSearchDocumentHit]:
        """
        Helper function that can be reused to find SDocs or Memos with different queries.
        :param query: The ElasticSearch query object in ES Query DSL
        :param skip: The number of skipped elements
        :param limit: The maximum number of returned elements
        :return: A (possibly empty) list of Memo matching the query
        :rtype: List[DocumentElasticSearchHit]
        """
        if sdoc:
            idx = self.__get_index_name(proj_id=proj_id, index_type="doc")
        else:
            idx = self.__get_index_name(proj_id=proj_id, index_type="memo")

        if not self.__client.indices.exists(index=idx):
            raise ValueError(f"ElasticSearch Index '{idx}' does not exist!")

        if query is None or len(query) < 1:
            raise ValueError("Query DSL object must not be None or empty!")

        if isinstance(limit, int) and (limit > 10000 or limit < 1):
            raise ValueError("Limit must be a positive Integer smaller than 10000!")
        elif isinstance(skip, int) and (skip > 10000 or skip < 1):
            raise ValueError("Skip must be a positive Integer smaller than 10000!")
        elif limit is None or skip is None:
            # use scroll api
            res = list(
                helpers.scan(
                    index=idx,
                    query={"query": query, "_source": source_fields, "highlight": highlight},
                    client=self.__client,
                    scroll="10m",
                    size=10000,
                    preserve_order=True,
                )
            )

            document_hits = []
            for document in res:
                highlights = document["highlight"]["content"] if "highlight" in document else []
                document_hit = ElasticSearchDocumentHit(
                    sdoc_id = document["_id"],
                    score = document["_score"],
                    highlights=highlights)
                document_hits.append(document_hit)
            
            return document_hits

        # use search api
        client_response = self.__client.search(
            index=idx,
            query=query,
            size=limit,
            from_=skip,
            _source=source_fields,
            highlight=highlight
        )
        return client_response

    def __search_sdocs(
        self,
        *,
        proj_id: int,
        query: Dict[str, Any],
        limit: Optional[int] = None,
        skip: Optional[int] = None,
        highlight: Optional[Dict[str, Any]],
    ) -> list[ElasticSearchDocumentHit]:
        return self.__search(
            sdoc=True,
            proj_id=proj_id,
            query=query,
            limit=limit,
            skip=skip,
            source_fields=False,
            highlight = highlight,
        )

    def __search_memos(
        self,
        *,
        proj_id: int,
        query: Dict[str, Any],
        user_id: int,
        starred: Optional[bool] = None,
        limit: Optional[int] = None,
        skip: Optional[int] = None,
    ) -> PaginatedMemoSearchResults:
        # add user to query
        query["bool"]["must"].append({"match": {"user_id": user_id}})
        if starred is not None:
            # add starred to query
            query["bool"]["must"].append({"match": {"starred": str(starred).lower()}})

        res = self.__search(
            sdoc=False,
            proj_id=proj_id,
            query=query,
            limit=limit,
            skip=skip,
            source_fields=True,
        )
        # Flo: for convenience only...
        res = OmegaConf.create(res)
        if res.hits.total.value == 0:
            return PaginatedMemoSearchResults(
                memos=[],
                has_more=False,
                total=0,
                current_page_offset=skip if skip is not None else 0,
                next_page_offset=0,
            )

        esmemos = [
            ElasticMemoHit(
                **OmegaConf.to_container(doc["_source"]), score=doc["_score"]
            )
            for doc in res.hits.hits
        ]

        memos = [
            MemoRead(
                title=esmemo.title,
                content=esmemo.content,
                starred=esmemo.starred,
                id=esmemo.memo_id,
                user_id=esmemo.user_id,
                project_id=esmemo.project_id,
                created=esmemo.created,
                updated=esmemo.updated,
                attached_object_id=esmemo.attached_object_id,
                attached_object_type=esmemo.attached_object_type,
            )
            for esmemo in esmemos
        ]

        has_more = limit is not None and res.hits.total.value > limit

        return PaginatedMemoSearchResults(
            memos=memos,
            has_more=has_more,
            total=res.hits.total.value,
            current_page_offset=skip if skip is not None else 0,
            next_page_offset=(skip + limit)
            if skip is not None and limit is not None and has_more
            else 0,
        )

    def search_sdocs_by_filename_query(
        self,
        *,
        proj_id: int,
        query: str,
        limit: Optional[int] = None,
        skip: Optional[int] = None,
    ) -> PaginatedElasticSearchDocumentHits:
        return self.__search_sdocs(
            proj_id=proj_id,
            query={
                "bool": {
                    "must": [{"match": {"filename": {"query": query, "fuzziness": 1}}}]
                }
            },
            limit=limit,
            skip=skip,
        )

    def search_sdocs_by_content_query(
        self,
        *,
        proj_id: int,
        sdoc_ids: Set[int],
        query: str,
        use_simple_query: bool = True,
        highlight: bool = False,
        limit: Optional[int] = None,
        skip: Optional[int] = None,
    ) -> list[ElasticSearchDocumentHit]:
        if use_simple_query:
            q = {
                "simple_query_string": {
                    "query": query,
                    "fields": ["content"],
                    "default_operator": "and",
                }
            }
        else:
            q = {"query_string": {"query": query, "default_field": "content"}}
        
        if highlight:
            highlight_query ={"fields": {
                "content": {}
            }}
        else:
            highlight_query = None
        
        # TODO clean up this code that is not reachable anyways?
        return self.__search_sdocs(
            proj_id=proj_id,
            query={"bool": {"must": [{"terms": {"sdoc_id": list(sdoc_ids)}}, q]}},
            limit=limit,
            skip=skip,
            highlight = highlight_query
        )

    def search_memos_by_title_query(
        self,
        *,
        proj_id: int,
        user_id: int,
        query: str,
        starred: Optional[bool] = None,
        limit: Optional[int] = None,
        skip: Optional[int] = None,
    ) -> PaginatedMemoSearchResults:
        return self.__search_memos(
            proj_id=proj_id,
            query={
                "bool": {
                    "must": [{"match": {"title": {"query": query, "fuzziness": 1}}}]
                }
            },
            user_id=user_id,
            starred=starred,
            limit=limit,
            skip=skip,
        )

    def search_memos_by_content_query(
        self,
        *,
        proj_id: int,
        user_id: int,
        query: str,
        starred: Optional[bool] = None,
        limit: Optional[int] = None,
        skip: Optional[int] = None,
    ) -> PaginatedMemoSearchResults:
        return self.__search_memos(
            proj_id=proj_id,
            query={
                "bool": {
                    "must": [{"match": {"content": {"query": query, "fuzziness": 1}}}]
                }
            },
            user_id=user_id,
            starred=starred,
            limit=limit,
            skip=skip,
        )

    def _get_client(self) -> Elasticsearch:
        """
        private function used for testing purpose
        """
        return self.__client
