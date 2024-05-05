from collections import Counter
from typing import Dict, List, Optional, Set

from sqlalchemy import Integer, String, cast, func
from sqlalchemy.dialects.postgresql import ARRAY, array, array_agg
from sqlalchemy.orm import InstrumentedAttribute, Session

from app.core.data.crud.project_metadata import crud_project_meta
from app.core.data.doc_type import DocType
from app.core.data.dto.search import (
    SearchColumns,
    SimSearchImageHit,
    SimSearchQuery,
    SimSearchSentenceHit,
    ElasticSearchDocumentHit
)
from app.core.data.dto.search_stats import KeywordStat, SpanEntityStat, TagStat
from app.core.data.orm.annotation_document import AnnotationDocumentORM
from app.core.data.orm.code import CodeORM, CurrentCodeORM
from app.core.data.orm.document_tag import (
    DocumentTagORM,
    SourceDocumentDocumentTagLinkTable,
)
from app.core.data.orm.source_document import SourceDocumentORM
from app.core.data.orm.source_document_metadata import SourceDocumentMetadataORM
from app.core.data.orm.span_annotation import SpanAnnotationORM
from app.core.data.orm.span_text import SpanTextORM
from app.core.data.orm.user import UserORM
from app.core.db.sql_service import SQLService
from app.core.filters.columns import (
    ColumnInfo,
)
from app.core.filters.filtering import Filter, apply_filtering
from app.core.filters.sorting import Sort, apply_sorting
from app.core.search.elasticsearch_service import ElasticSearchService
from app.core.search.simsearch_service import SimSearchService
from app.util.singleton_meta import SingletonMeta


def aggregate_ids(column: InstrumentedAttribute, label: str):
    return func.array_remove(
        array_agg(func.distinct(column), type_=ARRAY(Integer)),
        None,
        type_=ARRAY(Integer),
    ).label(label)


class SearchService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.sqls = SQLService()
        cls.sss = SimSearchService()
        return super(SearchService, cls).__new__(cls)

    def search_info(self, project_id) -> List[ColumnInfo[SearchColumns]]:
        with self.sqls.db_session() as db:
            metadata_column_info = crud_project_meta.create_metadata_column_info(
                db=db,
                project_id=project_id,
                allowed_doctypes=[
                    DocType.text,
                    DocType.image,
                    DocType.video,
                    DocType.audio,
                ],
            )
        return [
            ColumnInfo[SearchColumns].from_column(column) for column in SearchColumns
        ] + metadata_column_info

    def search(
        self,
        project_id: int,
        search_query: str,
        expert_mode: bool,
        highlight: bool,
        filter: Filter[SearchColumns],
        sorts: List[Sort[SearchColumns]],
    ) -> list[ElasticSearchDocumentHit]:
        with self.sqls.db_session() as db:
            filtered_sdoc_ids = self._get_filtered_sdoc_ids(
                db, project_id, filter, sorts
            )

        if search_query.strip() == "":
            return filtered_sdoc_ids
        else:
            # use elasticseach for full text seach
            elastic_hits = ElasticSearchService().search_sdocs_by_content_query(
                proj_id=project_id,
                query=search_query,
                sdoc_ids=set(filtered_sdoc_ids),
                use_simple_query=not expert_mode,
                highlight=highlight,
            )

            return elastic_hits

    def _get_filtered_sdoc_ids(
        self,
        db: Session,
        project_id: int,
        filter: Filter[SearchColumns],
        sorts: Optional[List[Sort[SearchColumns]]] = None,
    ) -> List[int]:
        tag_ids_agg = aggregate_ids(
            DocumentTagORM.id, label=SearchColumns.DOCUMENT_TAG_ID_LIST
        )
        code_ids_agg = aggregate_ids(CodeORM.id, SearchColumns.CODE_ID_LIST)
        user_ids_agg = aggregate_ids(UserORM.id, SearchColumns.USER_ID_LIST)
        span_annotation_tuples_agg = cast(
            array_agg(
                func.distinct(array([cast(CodeORM.id, String), SpanTextORM.text])),
            ),
            ARRAY(String, dimensions=2),
        ).label(SearchColumns.SPAN_ANNOTATIONS)

        subquery = (
            db.query(
                SourceDocumentORM.id,
                tag_ids_agg,
                code_ids_agg,
                user_ids_agg,
                span_annotation_tuples_agg,
            )
            # isouter=True is important, otherwise we will only get sdocs with tags
            .join(SourceDocumentORM.document_tags, isouter=True)
            .join(SourceDocumentORM.annotation_documents)
            .join(AnnotationDocumentORM.user)
            # isouter=True is important, otherwise we will only get sdocs with annotations
            .join(AnnotationDocumentORM.span_annotations, isouter=True)
            .join(SpanAnnotationORM.span_text, isouter=True)
            .join(SpanAnnotationORM.current_code, isouter=True)
            .join(CurrentCodeORM.code, isouter=True)
            .join(SourceDocumentORM.metadata_)
            .join(SourceDocumentMetadataORM.project_metadata)
            .group_by(SourceDocumentORM.id)
            .filter(SourceDocumentORM.project_id == project_id)
            .subquery()
        )

        query = db.query(
            SourceDocumentORM.id,
        ).join(subquery, SourceDocumentORM.id == subquery.c.id)

        query = apply_filtering(
            query=query, filter=filter, db=db, subquery_dict=subquery.c
        )

        if sorts is not None:
            query = apply_sorting(query=query, sorts=sorts, db=db)

        # query = query.order_by(
        #     SourceDocumentORM.id
        # )  # this is very important, otherwise pagination will not work!
        # query, pagination = apply_pagination(
        #     query=query, page_number=page + 1, page_size=page_size
        # )

        return [row[0] for row in query.all()]

    def compute_tag_statistics(
        self,
        sdoc_ids: Set[int],
    ) -> List[TagStat]:
        with self.sqls.db_session() as db:
            # tag statistics for the sdoc_ids
            count = func.count().label("count")
            query = (
                db.query(DocumentTagORM, count)
                .join(
                    SourceDocumentDocumentTagLinkTable,
                    SourceDocumentDocumentTagLinkTable.document_tag_id
                    == DocumentTagORM.id,
                )
                .filter(
                    SourceDocumentDocumentTagLinkTable.source_document_id.in_(
                        list(sdoc_ids)
                    )
                )
                .group_by(DocumentTagORM.id)
                .order_by(count.desc())
            )
            filtered_res = query.all()
            tag_ids = [tag.id for tag, _ in filtered_res]

            # global tag statistics
            count = func.count().label("count")
            query = (
                db.query(SourceDocumentDocumentTagLinkTable.document_tag_id, count)
                .filter(SourceDocumentDocumentTagLinkTable.document_tag_id.in_(tag_ids))
                .group_by(SourceDocumentDocumentTagLinkTable.document_tag_id)
                .order_by(
                    func.array_position(
                        tag_ids, SourceDocumentDocumentTagLinkTable.document_tag_id
                    )
                )
            )
            global_res = query.all()

        return [
            TagStat(tag=tag, filtered_count=fcount, global_count=gcount)
            for (tag, fcount), (tid, gcount) in zip(filtered_res, global_res)
        ]

    def __count_keywords(
        self,
        keyword_metadata: List[SourceDocumentMetadataORM],
        top_k: Optional[int] = None,
    ) -> Dict[str, int]:
        # get keyword lists per sdoc
        keywords_list = [
            x.list_value for x in keyword_metadata if x.list_value is not None
        ]
        # flatten the list
        keywords = [
            keyword for keyword_list in keywords_list for keyword in keyword_list
        ]
        # count the keywords
        if top_k is None:
            return dict(Counter(keywords))
        else:
            return dict(Counter(keywords).most_common(top_k))

    def compute_keyword_statistics(
        self, *, proj_id: int, sdoc_ids: Set[int], top_k: int = 50
    ) -> List[KeywordStat]:
        with self.sqls.db_session() as db:
            # 1. query keyword project metadadta
            project_metadata = crud_project_meta.read_by_project_and_key(
                db=db, project_id=proj_id, key="keywords"
            )
            project_metadata_ids = [pm.id for pm in project_metadata]
            if len(project_metadata_ids) == 0:
                return []

            # 2. query keyword metadata for the sdoc_ids
            filtered_keywords_metadata = (
                db.query(SourceDocumentMetadataORM)
                .filter(
                    SourceDocumentMetadataORM.project_metadata_id.in_(
                        [pm_id for pm_id in project_metadata_ids]
                    ),
                    SourceDocumentMetadataORM.source_document_id.in_(sdoc_ids),
                )
                .all()
            )
            topk_filtered_keywords = self.__count_keywords(
                filtered_keywords_metadata, top_k=top_k
            )

            # 3. query keyword metadata for all sdocs
            all_keywords_metadata = (
                db.query(SourceDocumentMetadataORM)
                .filter(
                    SourceDocumentMetadataORM.project_metadata_id.in_(
                        [pm_id for pm_id in project_metadata_ids]
                    )
                )
                .all()
            )
            all_keywords = self.__count_keywords(all_keywords_metadata)

        # 4. construct result
        return [
            KeywordStat(
                keyword=keyword,
                filtered_count=count,
                global_count=all_keywords[keyword],
            )
            for keyword, count in topk_filtered_keywords.items()
        ]

    def compute_code_statistics(
        self,
        code_id: int,
        sdoc_ids: Set[int],
        limit: Optional[int] = None,
    ) -> List[SpanEntityStat]:
        with self.sqls.db_session() as db:
            # we always want ADocs from the SYSTEM_USER

            # code statistics for the sdoc_ids
            count = func.count().label("count")
            query = (
                db.query(
                    SpanTextORM.id,
                    SpanTextORM.text,
                    count,
                )
                .join(SpanTextORM.span_annotations)
                .join(SpanAnnotationORM.annotation_document)
                .join(SpanAnnotationORM.current_code)
                .join(CurrentCodeORM.code)
                .group_by(SpanTextORM.id)
                .filter(
                    CodeORM.id == code_id,
                    AnnotationDocumentORM.source_document_id.in_(list(sdoc_ids)),
                )
                .order_by(count.desc())
            )

            if limit is not None:
                query = query.limit(limit)

            filtered_res = query.all()
            span_text_ids = [row[0] for row in filtered_res]

            # global code statistics
            count = func.count().label("count")
            query = (
                db.query(
                    SpanTextORM.id,
                    SpanTextORM.text,
                    count,
                )
                .join(SpanTextORM.span_annotations)
                .join(SpanAnnotationORM.annotation_document)
                .join(SpanAnnotationORM.current_code)
                .join(CurrentCodeORM.code)
                .group_by(SpanTextORM.id)
                .filter(
                    CodeORM.id == code_id,
                    SpanTextORM.id.in_(span_text_ids),
                )
                .order_by(func.array_position(span_text_ids, SpanTextORM.id))
            )
            global_res = query.all()

        return [
            SpanEntityStat(
                code_id=code_id,
                span_text=ftext,
                filtered_count=fcount,
                global_count=gcount,
            )
            for (ftextid, ftext, fcount), (gtextid, gtext, gcount) in zip(
                filtered_res, global_res
            )
        ]

    def find_similar_sentences(
        self,
        query: SimSearchQuery,
    ) -> List[SimSearchSentenceHit]:
        with self.sqls.db_session() as db:
            filtered_sdoc_ids = self._get_filtered_sdoc_ids(
                db, query.proj_id, query.filter
            )
        return self.sss.find_similar_sentences(filtered_sdoc_ids, query=query)

    def find_similar_images(
        self,
        query: SimSearchQuery,
    ) -> List[SimSearchImageHit]:
        with self.sqls.db_session() as db:
            filtered_sdoc_ids = self._get_filtered_sdoc_ids(
                db, query.proj_id, query.filter
            )
        return self.sss.find_similar_images(filtered_sdoc_ids, query=query)
