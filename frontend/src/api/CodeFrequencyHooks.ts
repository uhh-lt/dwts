import { useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey.ts";
import { CodeFrequency } from "./openapi/models/CodeFrequency.ts";
import { CodeOccurrence } from "./openapi/models/CodeOccurrence.ts";
import { DocType } from "./openapi/models/DocType.ts";
import { AnalysisService } from "./openapi/services/AnalysisService.ts";

const useCodeFrequencies = (projectId: number, userIds: number[], codeIds: number[], docTypes: DocType[]) =>
  useQuery<CodeFrequency[], Error>({
    queryKey: [QueryKey.ANALYSIS_CODE_FREQUENCIES, projectId, userIds, codeIds, docTypes],
    queryFn: () =>
      AnalysisService.codeFrequencies({
        projectId,
        requestBody: {
          user_ids: userIds,
          code_ids: codeIds,
          doctypes: docTypes,
        },
      }),
  });

const useCodeOccurrences = (projectId: number, userIds: number[], codeId: number | null | undefined) =>
  useQuery<CodeOccurrence[], Error>({
    queryKey: [QueryKey.ANALYSIS_CODE_OCCURRENCES, projectId, userIds, codeId],
    queryFn: () =>
      AnalysisService.codeOccurrences({
        projectId,
        codeId: codeId!,
        requestBody: userIds,
      }),
    enabled: userIds.length > 0 && !!codeId,
  });

const useReturnTopicDistrData = () =>
  useQuery<Array<Record<string, unknown>>, Error>({
    queryKey: ["Test1"],
    queryFn: () => AnalysisService.returnTopicDistrData(),
  });

const useReturnTopWordsData = () =>
  useQuery<Array<Record<string, unknown>>, Error>({
    queryKey: ["Test2"],
    queryFn: () => AnalysisService.returnTopWordsData(),
  });

const useReturnTopWordsOllama = (topic_id: number) => {
  console.log("CALL");
  return useQuery<Array<Record<string, unknown>>, Error>({
    queryKey: ["UseDTOHook", topic_id],
    queryFn: () => AnalysisService.returnTopWordsOllama({ topicId: topic_id }),
  });
};

const AnalysisHooks = {
  useCodeFrequencies,
  useCodeOccurrences,
  useReturnTopicDistrData,
  useReturnTopWordsData,
  useReturnTopWordsOllama,
};

export default AnalysisHooks;
