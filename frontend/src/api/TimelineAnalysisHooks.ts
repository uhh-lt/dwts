import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { TimelineAnalysisRead } from "./openapi/models/TimelineAnalysisRead.ts";
import { TimelineAnalysisService } from "./openapi/services/TimelineAnalysisService.ts";

// TIMELINE QUERIES

export type TimelineMap = Record<number, TimelineAnalysisRead>;

interface UseTimelineAnalysisQueryParams<T> {
  select?: (data: TimelineMap) => T;
  enabled?: boolean;
}

const useUserTimelinesQuery = <T = TimelineMap>({ select, enabled }: UseTimelineAnalysisQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, projectId],
    queryFn: async () => {
      const data = await TimelineAnalysisService.getByProjectAndUser({ projectId: projectId! });
      return data.reduce((acc, timeline) => {
        acc[timeline.id] = timeline;
        return acc;
      }, {} as TimelineMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
  });
};

const useGetTimelineAnalysis = (timelineAnalysisId: number | null | undefined) =>
  useUserTimelinesQuery({
    select: (data) => data[timelineAnalysisId!],
    enabled: !!timelineAnalysisId,
  });

const useGetUserTimelineAnalysisList = () => useUserTimelinesQuery({ select: (data) => Object.values(data) });

// TIMELINE MUTATIONS
const useCreateTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.create,
    onSuccess(data) {
      queryClient.setQueryData<TimelineMap>([QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id], (prev) =>
        prev ? { ...prev, [data.id]: data } : { [data.id]: data },
      );
    },
  });

const useUpdateTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.updateById,
    onSuccess(data) {
      queryClient.setQueryData<TimelineMap>([QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id], (prev) =>
        prev ? { ...prev, [data.id]: data } : { [data.id]: data },
      );
    },
  });

const useDuplicateTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.duplicateById,
    onSuccess(data) {
      queryClient.setQueryData<TimelineMap>([QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id], (prev) =>
        prev ? { ...prev, [data.id]: data } : { [data.id]: data },
      );
    },
  });

const useDeleteTimelineAnalysis = () =>
  useMutation({
    mutationFn: TimelineAnalysisService.deleteById,
    onSuccess(data) {
      queryClient.setQueryData<TimelineMap>([QueryKey.TIMELINE_ANALYSIS_PROJECT_USER, data.project_id], (prev) => {
        if (!prev) return prev;
        const newData = { ...prev };
        delete newData[data.id];
        return newData;
      });
    },
  });

const TimelineAnalysisHooks = {
  useGetUserTimelineAnalysisList,
  useGetTimelineAnalysis,
  useCreateTimelineAnalysis,
  useUpdateTimelineAnalysis,
  useDuplicateTimelineAnalysis,
  useDeleteTimelineAnalysis,
};

export default TimelineAnalysisHooks;
