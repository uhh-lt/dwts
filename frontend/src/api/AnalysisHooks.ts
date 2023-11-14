import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";
import {
  AnalysisConcept,
  AnalysisService,
  AnnotationOccurrence,
  CodeFrequency,
  CodeOccurrence,
  TimelineAnalysisResult,
} from "./openapi";

const useCodeFrequencies = (projectId: number, userIds: number[], codeIds: number[]) =>
  useQuery<CodeFrequency[], Error>([QueryKey.ANALYSIS_CODE_FREQUENCIES, projectId, userIds, codeIds], () =>
    AnalysisService.codeFrequencies({
      projectId,
      requestBody: {
        user_ids: userIds,
        code_ids: codeIds,
      },
    }),
  );

const useCodeOccurrences = (projectId: number, userIds: number[], codeId: number | undefined) =>
  useQuery<CodeOccurrence[], Error>(
    [QueryKey.ANALYSIS_CODE_OCCURRENCES, projectId, userIds, codeId],
    () =>
      AnalysisService.codeOccurrences({
        projectId,
        codeId: codeId!,
        requestBody: userIds,
      }),
    {
      enabled: userIds.length > 0 && !!codeId,
    },
  );

const useAnnotationOccurrences = (projectId: number, userIds: number[], codeId: number | undefined) =>
  useQuery<AnnotationOccurrence[], Error>(
    [QueryKey.ANALYSIS_ANNOTATION_OCCURRENCES, projectId, userIds, codeId],
    () =>
      AnalysisService.annotationOccurrences({
        projectId,
        codeId: codeId!,
        requestBody: userIds,
      }),
    {
      enabled: userIds.length > 0 && !!codeId,
    },
  );

const useTimelineAnalysis = (projectId: number, metadataKey: string, threshold: number, concepts: AnalysisConcept[]) =>
  useQuery<TimelineAnalysisResult[], Error>(
    [QueryKey.ANALYSIS_TIMELINE, projectId, metadataKey, threshold, concepts],
    () =>
      AnalysisService.timelineAnalysis({
        projectId,
        metadataKey,
        threshold,
        requestBody: concepts,
      }),
    {
      enabled: concepts.length > 0 && metadataKey.length > 0,
    },
  );

const AnalysisHooks = {
  useCodeFrequencies,
  useCodeOccurrences,
  useTimelineAnalysis,
  useAnnotationOccurrences,
};

export default AnalysisHooks;
