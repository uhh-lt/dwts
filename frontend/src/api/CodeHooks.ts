import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { CodeRead } from "./openapi/models/CodeRead.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { CodeService } from "./openapi/services/CodeService.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";

// memo
const useGetUserMemo = (codeId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_CODE, codeId],
    queryFn: () => CodeService.getUserMemo({ codeId: codeId! }),
    retry: false,
    enabled: !!codeId,
  });

// code
interface UseProjectCodesQueryParams<T> {
  select?: (data: CodeRead[]) => T;
  enabled?: boolean;
}

const useProjectCodesQuery = <T = CodeRead[]>({ select, enabled }: UseProjectCodesQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_CODES, projectId],
    queryFn: () =>
      ProjectService.getProjectCodes({
        projId: projectId!,
      }),
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
  });
};

const useGetCode = (codeId: number | null | undefined) => {
  return useProjectCodesQuery({
    select: (data) => data.find((code) => code.id === codeId)!,
    enabled: !!codeId,
  });
};

const useSelectEnabledCodes = () => {
  const disabledCodeIds = useAppSelector((state: RootState) => state.annotations.disabledCodeIds);
  return useCallback(
    (data: CodeRead[]) => data.filter((code) => disabledCodeIds.indexOf(code.id) === -1),
    [disabledCodeIds],
  );
};

const useGetAllCodes = () => useProjectCodesQuery({});

const useGetEnabledCodes = () => {
  const selectEnabledCodes = useSelectEnabledCodes();
  return useProjectCodesQuery({ select: selectEnabledCodes });
};

const useCreateCode = () =>
  useMutation({
    mutationFn: CodeService.createNewCode,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        [QueryKey.PROJECT_CODES, variables.requestBody.project_id],
        (oldData: CodeRead[] | undefined) => (oldData ? [...oldData, data] : [data]),
      );
    },
  });

const useUpdateCode = () =>
  useMutation({
    mutationFn: CodeService.updateById,
    onSuccess: (data) => {
      queryClient.setQueryData([QueryKey.PROJECT_CODES, data.project_id], (oldData: CodeRead[] | undefined) =>
        oldData ? oldData.map((code) => (code.id === data.id ? data : code)) : oldData,
      );
    },
  });

const useDeleteCode = () =>
  useMutation({
    mutationFn: CodeService.deleteById,
    onSuccess: (data) => {
      queryClient.setQueryData([QueryKey.PROJECT_CODES, data.project_id], (oldData: CodeRead[] | undefined) =>
        oldData ? oldData.filter((code) => code.id !== data.id) : oldData,
      );
    },
  });

const CodeHooks = {
  useGetUserMemo,
  // codes
  useGetAllCodes,
  useGetEnabledCodes,
  useGetCode,
  useCreateCode,
  useUpdateCode,
  useDeleteCode,
};

export default CodeHooks;
