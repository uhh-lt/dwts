import { Box, Portal, Stack, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import TagHooks from "../../../api/TagHooks.ts";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import { SampledSdocsResults } from "../../../api/openapi/models/SampledSdocsResults.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import OneSidebarLayout from "../../../layouts/OneSidebarLayout.tsx";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import DocumentsBarChart from "./DocumentsBarChart.tsx";
import DocumentsTable from "./DocumentsTable.tsx";
import SamplingStrategySelector from "./SamplingStrategySelector.tsx";
import TagGroupCreator from "./TagGroupCreator.tsx";
import { DocumentSamplerActions } from "./documentSamplerSlice.ts";

function DocumentSampler() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux)
  const aggregationGroups = useAppSelector((state) => state.documentSampler.aggregationGroups);
  const fixedSamplingValue = useAppSelector((state) => state.documentSampler.fixedSamplingValue);
  const relativeSamplingValue = useAppSelector((state) => state.documentSampler.relativeSamplingValue);
  const dispatch = useAppDispatch();

  // global server state
  const tags = TagHooks.useGetAllTags();
  const tagsMap = useMemo(() => {
    if (!tags.data) {
      return {};
    }
    return tags.data.reduce(
      (acc, tag) => {
        acc[tag.id] = tag;
        return acc;
      },
      {} as Record<number, DocumentTagRead>,
    );
  }, [tags.data]);

  // mutations
  const transformAndStore = useCallback(
    (data: SampledSdocsResults[]) => {
      const result = data.map((x) => {
        return {
          tags: x.tags.map((tagId) => tagsMap[tagId]),
          count: x.sdocs.length,
          sdocIds: x.sdocs,
          fixedSampleSdocIds: x.sample_fixed,
          fixedSampleCount: x.sample_fixed.length,
          relativeSampleSdocIds: x.sample_relative,
          relativeSampleCount: x.sample_relative.length,
        };
      });
      dispatch(DocumentSamplerActions.onUpdateChartData(result));
    },
    [dispatch, tagsMap],
  );
  const { mutate: aggregateSdocsByTags } = useMutation({
    mutationFn: AnalysisService.sampleSdocsByTags,
    onSuccess: transformAndStore,
  });

  // actions
  const onAggregate = () => {
    aggregateSdocsByTags({
      projectId,
      n: fixedSamplingValue,
      frac: relativeSamplingValue,
      requestBody: Object.values(aggregationGroups).map((tags) => tags.map((tag) => tag.id)),
    });
  };

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" component="div">
          Document Sampler
        </Typography>
      </Portal>
      <OneSidebarLayout
        leftSidebar={
          <Box className="h100 myFlexContainer">
            <TagGroupCreator
              tags={tags.data || []}
              aggregationGroups={aggregationGroups}
              cardProps={{ className: "myFlexFillAllContainer", sx: { mb: 2 }, elevation: 0 }}
            />
            <SamplingStrategySelector cardProps={{ elevation: 0 }} />
          </Box>
        }
        content={
          <Stack className="h100" p={2} spacing={2}>
            <DocumentsBarChart cardProps={{ sx: { height: "50%" } }} onChartRefresh={onAggregate} />
            <DocumentsTable cardProps={{ sx: { height: "50%" } }} onTableRefresh={onAggregate} />
          </Stack>
        }
      />
    </>
  );
}

export default DocumentSampler;
