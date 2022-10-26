from typing import List, Union, Dict

from PIL.Image import Image

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.span_annotation import crud_span_anno
from app.core.data.dto.search import SearchSDocsQueryParameters, SimSearchSentenceHit
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.span_annotation import SpanAnnotationRead
from app.core.db.sql_service import SQLService
from app.core.search.elasticsearch_service import ElasticSearchService
from app.docprepro.simsearch import find_similar_sentences_apply_async, find_similar_images_apply_async
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

            if query_params.file_name:
                sdocs_ids.append([hit.sdoc_id for hit in
                                  ElasticSearchService().search_sdocs_by_prefix_filename(proj_id=query_params.proj_id,
                                                                                         filename_prefix=query_params.file_name,
                                                                                         **skip_limit).hits])

            if query_params.keywords:
                sdocs_ids.append([hit.sdoc_id for hit in
                                  ElasticSearchService().search_sdocs_by_keywords_query(proj_id=query_params.proj_id,
                                                                                        keywords=query_params.keywords,
                                                                                        **skip_limit).hits])

            if len(sdocs_ids) == 0:
                # no search results, so we return all documents!

                return [sdoc.id for sdoc in crud_sdoc.read_by_project(db=db,
                                                                      proj_id=query_params.proj_id,
                                                                      only_finished=True)]
            else:
                # we have search results, now we combine!
                return list(set.intersection(*map(set, sdocs_ids)))

    def find_similar_sentences(self, proj_id: int, query: Union[str, Image], top_k: int = 10) \
            -> List[SimSearchSentenceHit]:

        # perform the simsearch and get the span anno ids with scores
        top_k: Dict[int, float] = find_similar_sentences_apply_async(proj_id=proj_id,
                                                                     query=query,
                                                                     top_k=top_k).get()

        with self.sqls.db_session() as db:
            span_orms = crud_span_anno.read_by_ids(db=db, ids=list(top_k.keys()))

            return [SimSearchSentenceHit(sdoc_id=span_orm.annotation_document.source_document_id,
                                         score=score,
                                         sentence_text=span_orm.span_text.text,
                                         sentence_span=SpanAnnotationRead.from_orm(span_orm))
                    for span_orm, score in zip(span_orms, top_k.values())]

    def find_similar_images(self, proj_id: int, query: Union[str, Image], top_k: int = 10) \
            -> List[SourceDocumentRead]:

        # perform the simsearch and get the sdoc ids with scores
        top_k: Dict[int, float] = find_similar_images_apply_async(proj_id=proj_id,
                                                                  query=query,
                                                                  top_k=top_k).get()

        with self.sqls.db_session() as db:
            sdoc_orms = crud_sdoc.read_by_ids(db=db, ids=list(top_k.keys()))

        return [SourceDocumentRead.from_orm(sdoc_orm)
                for sdoc_orm, score in zip(sdoc_orms, top_k.values())]
