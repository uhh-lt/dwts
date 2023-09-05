import { useMutation, useQuery } from "@tanstack/react-query";
import { CodeRead, CodeService, MemoRead } from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";

// memo
const useCreateMemo = () =>
  useMutation(CodeService.addMemo, {
    onSuccess: (createdMemo) => {
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, createdMemo.user_id]);
      queryClient.invalidateQueries([QueryKey.MEMO_CODE, createdMemo.attached_object_id, createdMemo.user_id]);
    },
  });

const useGetMemos = (codeId: number | undefined) =>
  useQuery<MemoRead[], Error>([QueryKey.MEMO_CODE, codeId], () => CodeService.getMemos({ codeId: codeId! }), {
    retry: false,
    enabled: !!codeId,
  });

const useGetMemo = (codeId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.MEMO_CODE, codeId, userId],
    () => CodeService.getUserMemos({ codeId: codeId!, userId: userId! }).then((memos) => memos[0]),
    {
      retry: false,
      enabled: !!codeId && !!userId,
    }
  );

// code
const useGetCode = (codeId: number | undefined) =>
  useQuery<CodeRead, Error>([QueryKey.CODE, codeId], () => CodeService.getById({ codeId: codeId! }), {
    enabled: !!codeId,
  });

const useCreateCode = () =>
  useMutation(CodeService.createNewCode, {
    onSuccess: (newCode, variables) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_CODES, variables.requestBody.project_id]);
      queryClient.invalidateQueries([QueryKey.USER_CODES, newCode.user_id]);
    },
  });

const useUpdateCode = () =>
  useMutation(CodeService.updateById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.CODE, data.id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_CODES, data.project_id]);
    },
  });

const useDeleteCode = () =>
  useMutation(CodeService.deleteById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.CODE, data.id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_CODES, data.project_id]);
      queryClient.invalidateQueries([QueryKey.USER_CODES, data.user_id]);
    },
  });

const CodeHooks = {
  useCreateMemo,
  useGetMemo,
  useGetMemos,
  useGetCode,
  useCreateCode,
  useUpdateCode,
  useDeleteCode,
};

export default CodeHooks;
