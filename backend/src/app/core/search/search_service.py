from typing import List

from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.search import SearchSDocsQueryParameters
from app.core.db.sql_service import SQLService
from app.core.search.elasticsearch_service import ElasticSearchService
from app.util.singleton_meta import SingletonMeta


class SearchService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):

        cls.sqls = SQLService()
        return super(SearchService, cls).__new__(cls)

    def search_sdoc_ids_by_sdoc_query_parameters(self,
                                                 query_params: SearchSDocsQueryParameters) -> List[int]:
        skip_limit = {"skip": None, "limit": None}

        with self.sqls.db_session() as db:
            sdocs_ids = []

            if query_params.span_entities:
                sdocs_ids.append(crud_sdoc.get_ids_by_span_entities(db=db,
                                                                    proj_id=query_params.proj_id,
                                                                    user_ids=query_params.user_ids,
                                                                    span_entities=query_params.span_entities,
                                                                    **skip_limit))

            if query_params.tag_ids:
                sdocs_ids.append(crud_sdoc.get_ids_by_document_tags(db=db, tag_ids=query_params.tag_ids,
                                                                    all_tags=query_params.all_tags, **skip_limit))

            if query_params.search_terms:
                sdocs_ids.append([hit.sdoc_id for hit in
                                  ElasticSearchService().search_sdocs_by_content_query(proj_id=query_params.proj_id,
                                                                                       query=" ".join(
                                                                                           # FIXME we want and not or!
                                                                                           query_params.search_terms),
                                                                                       **skip_limit).hits])

            if query_params.keywords:
                sdocs_ids.append([hit.sdoc_id for hit in
                                  ElasticSearchService().search_sdocs_by_keywords_query(proj_id=query_params.proj_id,
                                                                                        keywords=query_params.keywords,
                                                                                        **skip_limit).hits])

            if len(sdocs_ids) == 0:
                # no search results, so we return all documents!
                return [sdoc.id for sdoc in crud_project.read(db=db, id=query_params.proj_id).source_documents]
            else:
                # we have search results, now we combine!
                return list(set.intersection(*map(set, sdocs_ids)))
