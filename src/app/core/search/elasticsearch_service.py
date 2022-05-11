from typing import Dict, Any, Iterable, Optional, Set

import srsly
from elasticsearch import Elasticsearch, TransportError, ConnectionError
from loguru import logger

from app.core.data.dto.project import ProjectRead
from app.core.data.dto.search import ElasticSearchDocumentCreate, ElasticSearchDocumentRead, ElasticSearchMemoCreate, \
    ElasticSearchMemoRead
from app.util.singleton_meta import SingletonMeta
from config import conf


class ElasticSearchService(metaclass=SingletonMeta):

    def __new__(cls, *args: Iterable[Any], **kwargs: Dict[Any, Any]):
        try:
            # ElasticSearch Connection
            esc = Elasticsearch([{"host": conf.elasticsearch.host, "port": conf.elasticsearch.port, }],
                                use_ssl=conf.elasticsearch.use_ssl,
                                verify_certs=conf.elasticsearch.verify_certs,
                                # DO NOT SNIFF WHEN ES IS NOT IN LOCAL NETWORK! This will cause timeout errors
                                # sniff before doing anything
                                sniff_on_start=conf.elasticsearch.sniff_on_start,
                                sniff_on_connection_fail=conf.elasticsearch.sniff_on_connection_fail,
                                sniffer_timeout=conf.elasticsearch.sniffer_timeout)
            if not esc.ping():
                raise ConnectionError()

            cls.__client = esc

        except (ConnectionError, TransportError) as e:
            msg = f"Cannot connect to ElasticSearch - Error '{e}'"
            logger.error(msg)
            # TODO Flo: do we really want to exit here?
            raise SystemExit(msg)

        logger.info("Successfully established connection to ElasticSearch!")

        return super(ElasticSearchService, cls).__new__(cls)

    def __delete_index(self, index: str) -> None:
        if self.__client.indices.exists(index=index):
            self.__client.indices.delete(index=index)
            logger.info(f"Removed ElasticSearch Index '{index}'!")
        else:
            logger.info(f"Cannot remove ElasticSearch Index '{index}' since it does not exist!")

    def __create_index(self,
                       index: str,
                       mappings: Dict[str, Any],
                       settings: Dict[str, Any] = None,
                       replace_if_exists: bool = False) -> None:
        if replace_if_exists and self.__client.indices.exists(index=index):
            self.__delete_index(index=index)
        if not self.__client.indices.exists(index=index):
            self.__client.indices.create(index=index, mappings=mappings, settings=settings)
            logger.info(
                f"Created ElasticSearch Index '{index}' with Mappings: {mappings} and Settings: {settings}!")

    def create_project_indices(self, proj: ProjectRead) -> None:
        # create the ES Index for Documents
        doc_mappings = srsly.read_json(conf.elasticsearch.index_mappings.docs)
        doc_settings = conf.elasticsearch.index_settings.docs
        if doc_settings is not None:
            doc_settings = srsly.read_json(doc_settings)

        self.__create_index(index=proj.doc_index,
                            mappings=doc_mappings,
                            settings=doc_settings,
                            replace_if_exists=True)

        # create the ES Index for Memos
        memo_mappings = srsly.read_json(conf.elasticsearch.index_mappings.memos)
        memo_settings = conf.elasticsearch.index_settings.memos
        if memo_settings is not None:
            memo_settings = srsly.read_json(memo_settings)
        self.__create_index(index=proj.memo_index,
                            mappings=memo_mappings,
                            settings=memo_settings,
                            replace_if_exists=True)

    def remove_project_indices(self, proj: ProjectRead) -> None:
        self.__delete_index(index=proj.doc_index)
        self.__delete_index(index=proj.memo_index)

    def add_document_to_index(self,
                              proj: ProjectRead,
                              esdoc: ElasticSearchDocumentCreate) -> int:
        # TODO Flo: what to do when this fails!? How to keep the SQL and ES consistent
        res = self.__client.index(index=proj.doc_index,
                                  id=str(esdoc.sdoc_id),
                                  document=esdoc.json())
        if not res['_id'] == esdoc.sdoc_id:
            # FIXME Flo: What to do?!
            logger.error(f"ElasticSearch Document ID and SQL Document ID of Document {esdoc.filename} do not match!")

        logger.debug(f"Added Document '{esdoc.filename}' with ID '{res['_id']}' to Index '{proj.doc_index}'!")
        return res['_id']

    def get_esdoc_by_sdoc_id(self,
                             proj: ProjectRead,
                             sdoc_id: int,
                             fields: Set[str] = None) -> Optional[ElasticSearchDocumentRead]:
        res = self.__client.get(index=proj.doc_index,
                                id=str(sdoc_id),
                                _source_includes=fields)
        return ElasticSearchDocumentRead(**res["_source"])

    def delete_document_from_index(self,
                                   proj: ProjectRead,
                                   sdoc_id: int) -> None:
        self.__client.delete(index=proj.doc_index, id=str(sdoc_id))
        logger.info(f"Deleted Document with ID={sdoc_id} from Index '{proj.doc_index}'!")

    def add_memo_to_index(self,
                          proj: ProjectRead,
                          esmemo: ElasticSearchMemoCreate) -> int:
        res = self.__client.index(index=proj.memo_index,
                                  id=str(esmemo.memo_id),
                                  document=esmemo.json())
        if not res['_id'] == esmemo.memo_id:
            # FIXME Flo: What to do?!
            logger.error(f"ElasticSearch Memo ID and SQL Memo ID of Memo {esmemo.title} do not match!")
        logger.debug(f"Added Memo '{esmemo.title}' with ID '{res['_id']}' to Index '{proj.doc_index}'!")
        return res['_id']

    def get_esmemo_by_memo_id(self,
                              proj: ProjectRead,
                              memo_id: int,
                              fields: Set[str] = None) -> Optional[ElasticSearchMemoRead]:
        res = self.__client.get(index=proj.memo_index,
                                id=str(memo_id),
                                _source_includes=fields)
        return ElasticSearchMemoRead(**res["_source"])

    def delete_memo_from_index(self,
                               proj: ProjectRead,
                               memo_id: int) -> None:
        self.__client.delete(index=proj.memo_index, id=str(memo_id))
        logger.info(f"Deleted Memo with ID={memo_id} from Index '{proj.memo_index}'!")

    # def __search_sdocs(self, index: str, query: Dict[str, Any], limit: Optional[int] = 100) \
    #         -> List[SourceDocumentRead]:
    #     """
    #     Helper function that can be reused to find Documents with different queries.
    #     :param query: The ElasticSearch query object in ES Query DSL
    #     :param limit: The maximum number of returned Documents
    #     :return: A (possibly empty) list of Documents matching the query
    #     :rtype: List[DocumentElasticSearchHit]
    #     """
    #     self.__check_index_name(index)
    #
    #     if not self.__client.indices.exists(index=index):
    #         raise ValueError(f"ElasticSearch Index '{index}' does not exist!")
    #
    #     if query is None or len(query) < 1:
    #         raise ValueError("Query DSL object must not be None or empty!")
    #     if (not isinstance(limit, int)) or limit > 10000 or limit < 1:
    #         raise ValueError("Limit must be a positive Integer smaller than 10000!")
    #
    #     res = self.__client.search(index=index,
    #                                query=query,
    #                                size=limit,
    #                                filter_path=["hits.hits._source", "hits.hits._id", "hits.hits._score"])
    #
    #     if len(res) == 0:
    #         return []
    #
    #     return [DocumentElasticSearchHit(filename=doc["_source"]["filename"],
    #                                      created=doc["_source"]["created"],
    #                                      content=doc["_source"]["content"],
    #                                      score=doc["_score"],
    #                                      id=doc["_id"]) for doc in res["hits"]["hits"]]
    #
    # def search_sdocs_by_exact_filename(self, index: str, filename: str, limit: Optional[int] = 100) \
    #         -> List[SourceDocumentRead]:
    #     # Flo: Using term query since filename is a keyword field
    #     return self.__search_sdocs(index=index, query={
    #         "term": {
    #             "filename": filename
    #         }
    #     }, limit=limit)
    #
    # def search_sdocs_by_prefix_filename(self, index: str, filename_prefix: str, limit: Optional[int] = 100) \
    #         -> List[SourceDocumentRead]:
    #     return self.__search_sdocs(index=index, query={
    #         "prefix": {
    #             "filename": filename_prefix
    #         }
    #     }, limit=limit)
    #
    # def search_sdocs_via_query_in_content(self, index: str, query: str, limit: Optional[int] = 100) \
    #         -> List[SourceDocumentRead]:
    #     return self.__search_sdocs(index=index, query={
    #         "match": {
    #             "content": {
    #                 "query": query
    #                 # "fuzziness": 1
    #             }
    #         }
    #     }, limit=limit)
    #

    def _get_client(self) -> Elasticsearch:
        """
        private function used for testing purpose
        """
        return self.__client
