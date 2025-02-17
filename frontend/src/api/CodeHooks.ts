import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { CodeRead } from "./openapi/models/CodeRead.ts";
import { CodeService } from "./openapi/services/CodeService.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";

// CODE QUERIES

export type CodeMap = Record<number, CodeRead>;
interface UseProjectCodesQueryParams<T> {
  select?: (data: CodeMap) => T;
  enabled?: boolean;
}

const useProjectCodesQuery = <T = CodeMap>({ select, enabled }: UseProjectCodesQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_CODES, projectId],
    queryFn: async () => {
      const codes = await ProjectService.getProjectCodes({
        projId: projectId!,
      });
      return codes.reduce((acc, code) => {
        acc[code.id] = code;
        return acc;
      }, {} as CodeMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
  });
};

const useGetCode = (codeId: number | null | undefined) =>
  useProjectCodesQuery({
    select: (data) => data[codeId!],
    enabled: !!codeId,
  });

const useSelectEnabledCodes = () => {
  const disabledCodeIds = useAppSelector((state: RootState) => state.annotations.disabledCodeIds);
  return useCallback(
    (data: CodeMap) => Object.values(data).filter((code) => disabledCodeIds.indexOf(code.id) === -1),
    [disabledCodeIds],
  );
};

const useGetAllCodesList = () => useProjectCodesQuery({ select: (data) => Object.values(data) });

const useGetAllCodesMap = () => useProjectCodesQuery({});

const useGetEnabledCodes = () => {
  const selectEnabledCodes = useSelectEnabledCodes();
  return useProjectCodesQuery({ select: selectEnabledCodes });
};

// CODE MUTATIONS
const useCreateCode = () =>
  useMutation({
    mutationFn: CodeService.createNewCode,
    onSuccess: (data, variables) => {
      queryClient.setQueryData<CodeMap>([QueryKey.PROJECT_CODES, variables.requestBody.project_id], (oldData) =>
        oldData ? { ...oldData, [data.id]: data } : { [data.id]: data },
      );
    },
  });

const useUpdateCode = () =>
  useMutation({
    mutationFn: CodeService.updateById,
    onSuccess: (data) => {
      queryClient.setQueryData<CodeMap>([QueryKey.PROJECT_CODES, data.project_id], (oldData) =>
        oldData ? { ...oldData, [data.id]: data } : { [data.id]: data },
      );
    },
  });

const useDeleteCode = () =>
  useMutation({
    mutationFn: CodeService.deleteById,
    onSuccess: (data) => {
      queryClient.setQueryData<CodeMap>([QueryKey.PROJECT_CODES, data.project_id], (oldData) => {
        if (!oldData) return oldData;
        const newData = { ...oldData };
        delete newData[data.id];
        return newData;
      });
    },
  });

const CodeHooks = {
  // codes
  useGetAllCodesList,
  useGetAllCodesMap,
  useGetEnabledCodes,
  useGetCode,
  useCreateCode,
  useUpdateCode,
  useDeleteCode,
};

export default CodeHooks;
