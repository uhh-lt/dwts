import { useQuery } from "@tanstack/react-query";
import {
  DocType,
  KeywordStat,
  MemoContentQuery,
  MemoRead,
  MemoTitleQuery,
  PaginatedMemoSearchResults,
  SearchService,
  SimSearchSentenceHit,
  SpanEntityDocumentFrequency,
  TagStat,
} from "./openapi";
import { QueryKey } from "./QueryKey";
import { orderFilter, SearchFilter } from "../views/search/SearchFilter";
import queryClient from "../plugins/ReactQueryClient";
import { useAppSelector } from "../plugins/ReduxHooks";
import { useAuth } from "../auth/AuthProvider";

export enum SearchResultsType {
  // type DOCUMENTS returns data: number[]
  DOCUMENTS,
  // type SENTENCES returns data: sdocId -> SimSearchSentenceHit[]
  SENTENCES,
}

export interface SearchResults {
  data: number[] | Map<number, SimSearchSentenceHit[]>;
  type: SearchResultsType;
}

export function getSearchResultIds(results: SearchResults) {
  switch (results.type) {
    case SearchResultsType.DOCUMENTS:
      return results.data as number[];
    case SearchResultsType.SENTENCES:
      return Array.from((results.data as Map<number, SimSearchSentenceHit[]>).keys());
    default:
      return [];
  }
}

const useSearchDocumentsByProjectIdAndFilters = (projectId: number, filters: SearchFilter[]) => {
  const { user } = useAuth();
  const resultModalities = useAppSelector((state) => state.search.resultModalities);
  // const findImageModality = useAppSelector((state) => state.search.findImageModality);
  return useQuery<SearchResults, Error>(
    [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, projectId, user.data?.id, filters, resultModalities],
    async () => {
      const { keywords, tags, codes, texts, sentences, files, metadata } = orderFilter(filters);
      if (sentences.length === 1 && resultModalities.length === 1) {
        if (resultModalities[0] === DocType.TEXT) {
          const result = await SearchService.findSimilarSentences({
            projId: projectId,
            query: filters[0].data as string,
            topK: 10,
          });

          // combine multiple results (sentences) per document
          const x = new Map<number, SimSearchSentenceHit[]>();
          result.forEach((hit) => {
            const hits = x.get(hit.sdoc_id) || [];
            hits.push(hit);
            x.set(hit.sdoc_id, hits);
          });

          return {
            data: x,
            type: SearchResultsType.SENTENCES,
          };
        } else {
          // todo: please only return number[]
          const imageSdocs = await SearchService.findSimilarImages({
            projId: projectId,
            query: filters[0].data as string,
            topK: 10,
          });
          return { data: imageSdocs.map((img) => img.id), type: SearchResultsType.DOCUMENTS };
        }
      } else if (sentences.length === 0) {
        const sdocIds = await SearchService.searchSdocs({
          requestBody: {
            proj_id: projectId,
            user_ids: user.data ? [user.data.id] : undefined,
            span_entities: codes.length > 0 ? codes : undefined,
            tag_ids: tags.length > 0 ? tags : undefined,
            keywords: keywords.length > 0 ? keywords : undefined,
            search_terms: texts.length > 0 ? texts : undefined,
            file_name: files.length > 0 ? files[0] : undefined,
            metadata: metadata.length > 0 ? metadata : undefined,
            doc_types: resultModalities.length > 0 ? resultModalities : undefined,
            all_tags: true,
          },
        });
        return { data: sdocIds, type: SearchResultsType.DOCUMENTS };
      } else {
        console.error("ERROR!");
        return { data: [], type: SearchResultsType.DOCUMENTS };
      }
    }
  );
};

const useSearchDocumentsByProjectIdAndTagId = (projectId: number | undefined, tagId: number | undefined) =>
  useQuery<number[], Error>(
    [QueryKey.SDOCS_BY_PROJECT_AND_TAG_SEARCH, projectId, tagId],
    () => {
      return SearchService.searchSdocs({
        requestBody: {
          proj_id: projectId!,
          tag_ids: [tagId!],
          all_tags: true,
        },
      });
    },
    { enabled: !!tagId && !!projectId }
  );

const useSearchEntityDocumentStats = (projectId: number, filters: SearchFilter[]) => {
  const { user } = useAuth();
  const resultModalities = useAppSelector((state) => state.search.resultModalities);
  return useQuery<Map<number, SpanEntityDocumentFrequency[]>, Error>(
    [QueryKey.SEARCH_ENTITY_STATISTICS, projectId, user.data?.id, filters, resultModalities],
    async () => {
      const { keywords, tags, codes, texts, files, metadata } = orderFilter(filters);
      const data = await SearchService.searchEntityDocumentStats({
        requestBody: {
          proj_id: projectId,
          user_ids: user.data ? [user.data.id] : undefined,
          span_entities: codes.length > 0 ? codes : undefined,
          tag_ids: tags.length > 0 ? tags : undefined,
          keywords: keywords.length > 0 ? keywords : undefined,
          search_terms: texts.length > 0 ? texts : undefined,
          file_name: files.length > 0 ? files[0] : undefined,
          metadata: metadata.length > 0 ? metadata : undefined,
          doc_types: resultModalities.length > 0 ? resultModalities : undefined,
          all_tags: true,
        },
      });
      return new Map(Object.entries(data.stats).map((x) => [parseInt(x[0]), x[1]]));
    }
  );
};

const useSearchKeywordStats = (projectId: number, filters: SearchFilter[]) => {
  const { user } = useAuth();
  const resultModalities = useAppSelector((state) => state.search.resultModalities);
  return useQuery<KeywordStat[], Error>(
    [QueryKey.SEARCH_KEYWORD_STATISTICS, projectId, user.data?.id, filters, resultModalities],
    () => {
      const { keywords, tags, codes, texts, files, metadata } = orderFilter(filters);
      return SearchService.searchKeywordStats({
        requestBody: {
          proj_id: projectId,
          user_ids: user.data ? [user.data.id] : undefined,
          span_entities: codes.length > 0 ? codes : undefined,
          tag_ids: tags.length > 0 ? tags : undefined,
          keywords: keywords.length > 0 ? keywords : undefined,
          search_terms: texts.length > 0 ? texts : undefined,
          file_name: files.length > 0 ? files[0] : undefined,
          metadata: metadata.length > 0 ? metadata : undefined,
          doc_types: resultModalities.length > 0 ? resultModalities : undefined,
          all_tags: true,
        },
      });
    }
  );
};

const useSearchTagStats = (projectId: number, filters: SearchFilter[]) => {
  const { user } = useAuth();
  const resultModalities = useAppSelector((state) => state.search.resultModalities);
  return useQuery<TagStat[], Error>(
    [QueryKey.SEARCH_TAG_STATISTICS, projectId, user.data?.id, filters, resultModalities],
    () => {
      const { keywords, tags, codes, texts, files, metadata } = orderFilter(filters);
      return SearchService.searchTagStats({
        requestBody: {
          proj_id: projectId,
          user_ids: user.data ? [user.data.id] : undefined,
          span_entities: codes.length > 0 ? codes : undefined,
          tag_ids: tags.length > 0 ? tags : undefined,
          keywords: keywords.length > 0 ? keywords : undefined,
          search_terms: texts.length > 0 ? texts : undefined,
          file_name: files.length > 0 ? files[0] : undefined,
          metadata: metadata.length > 0 ? metadata : undefined,
          doc_types: resultModalities.length > 0 ? resultModalities : undefined,
          all_tags: true,
        },
      });
    },
    {
      // todo: check if this really works
      onSuccess: (data) => {
        data.forEach((tagStat) => {
          queryClient.setQueryData([QueryKey.TAG, tagStat.tag.id], tagStat.tag);
        });
      },
    }
  );
};

const useSearchMemoContent = (params: MemoContentQuery) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.MEMOS_BY_CONTENT_SEARCH, params.content_query],
    async () => {
      const result = await SearchService.searchMemosByContentQuery({
        requestBody: params,
      });

      return result.memos;
    },
    {
      enabled: params.content_query.length > 0,
    }
  );

const useSearchMemoTitle = (params: MemoTitleQuery) =>
  useQuery<PaginatedMemoSearchResults, Error>(
    [QueryKey.MEMOS_BY_TITLE_SEARCH, params.title_query],
    () =>
      SearchService.searchMemosByTitleQuery({
        requestBody: params,
      }),
    {
      enabled: params.title_query.length > 0,
    }
  );

const useSentenceSimilaritySearch = (projectId: number, filters: SearchFilter[]) =>
  useQuery<SearchResults, Error>(
    [QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, projectId, filters],
    async () => {
      const result = await SearchService.findSimilarSentences({
        projId: projectId,
        query: filters[0].data as string,
        topK: 10,
      });
      const data = new Map<number, SimSearchSentenceHit[]>();
      result.forEach((hit) => {
        const hits = data.get(hit.sdoc_id) || [];
        hits.push(hit);
        data.set(hit.sdoc_id, hits);
      });
      return {
        sdocIds: result.map((hit) => hit.sdoc_id),
        data: data,
        type: SearchResultsType.SENTENCES,
      };
    },
    {
      enabled: filters.length > 0,
    }
  );

const SearchHooks = {
  useSearchEntityDocumentStats,
  useSearchKeywordStats,
  useSearchTagStats,
  useSearchMemoTitle,
  useSearchMemoContent,
  useSearchDocumentsByProjectIdAndTagId,
  useSearchDocumentsByProjectIdAndFilters,
  useSentenceSimilaritySearch,
};

export default SearchHooks;
