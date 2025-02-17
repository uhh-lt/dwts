import { Divider, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { SdocColumns } from "../../../api/openapi/models/SdocColumns.ts";
import { SimSearchImageHit } from "../../../api/openapi/models/SimSearchImageHit.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import { MyFilter, createEmptyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import DocumentInformation from "../../../components/SourceDocument/DocumentInformation/DocumentInformation.tsx";
import TagExplorer from "../../../components/Tag/TagExplorer/TagExplorer.tsx";
import TwoSidebarsLayout from "../../../layouts/TwoSidebarsLayout.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../DocumentSearch/searchSlice.ts";
import SearchStatistics from "../Statistics/SearchStatistics.tsx";
import { useInitSearchFilterSlice } from "../useInitSearchFilterSlice.ts";
import ImageSimilaritySearchToolbar from "./ImageSimilaritySearchToolbar.tsx";
import ImageSimilarityView from "./ImageSimilarityView.tsx";

const filterName = "imageSimilaritySearch";

function ImageSimilaritySearch() {
  // router
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // redux (global client state)
  const selectedDocumentId = useAppSelector((state) => state.imageSearch.selectedDocumentId);
  const dispatch = useAppDispatch();

  // filter
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();

  // computed (local client state)
  const keywordMetadataIds = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata.data]);

  // handle filtering
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityStat) => {
      dispatch(SearchActions.onAddSpanAnnotationFilter({ codeId: stat.code_id, spanText: stat.span_text, filterName }));
    },
    [dispatch],
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      dispatch(SearchActions.onAddKeywordFilter({ keywordMetadataIds, keyword, filterName }));
    },
    [dispatch, keywordMetadataIds],
  );
  const handleAddTagFilter = useCallback(
    (tagId: number) => {
      dispatch(SearchActions.onAddTagFilter({ tagId, filterName }));
    },
    [dispatch],
  );

  // search
  useInitSearchFilterSlice({ projectId });
  const filter = useAppSelector((state) => state.search.filter[filterName]) || createEmptyFilter(filterName);
  const topK = useAppSelector((state) => state.imageSearch.topK);
  const threshold = useAppSelector((state) => state.imageSearch.threshold);
  const searchQuery = useAppSelector((state) => state.imageSearch.searchQuery);
  const { data, isError, isFetching, isLoading } = useQuery<SimSearchImageHit[]>({
    queryKey: [
      QueryKey.IMG_SIMSEARCH,
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      topK,
      threshold,
    ],
    queryFn: () =>
      SearchService.findSimilarImages({
        projId: projectId,
        threshold: threshold,
        topK: topK,
        requestBody: {
          query: searchQuery,
          filter: filter as MyFilter<SdocColumns>,
        },
      }),
  });
  // extract sdoc ids from results, but they have to be unique
  const sdocIds = useMemo(() => data?.map((hit) => hit.sdoc_id) || [], [data]);

  // render
  return (
    <TwoSidebarsLayout
      leftSidebar={
        <>
          <TagExplorer sx={{ height: "50%", pt: 0 }} onTagClick={handleAddTagFilter} />
          <Divider />
          <SearchStatistics
            sx={{ height: "50%" }}
            sdocIds={sdocIds}
            handleKeywordClick={handleAddKeywordFilter}
            handleTagClick={handleAddTagFilter}
            handleCodeClick={handleAddCodeFilter}
          />
        </>
      }
      content={
        <>
          <ImageSimilaritySearchToolbar searchResultDocumentIds={sdocIds} />
          <ImageSimilarityView
            projectId={projectId}
            data={data}
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
            boxProps={{
              className: "myFlexFillAllContainer",
              sx: { p: 1 },
            }}
          />
        </>
      }
      rightSidebar={
        <DocumentInformation
          filterName={filterName}
          sdocId={selectedDocumentId}
          isIdleContent={<Typography padding={2}>Click on an image to see info :)</Typography>}
        />
      }
    />
  );
}

export default ImageSimilaritySearch;
