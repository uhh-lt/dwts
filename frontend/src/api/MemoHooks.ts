import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { AttachedObjectType } from "./openapi/models/AttachedObjectType.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { MemoService } from "./openapi/services/MemoService.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";

// MEMO QUERIES
const useGetMemo = (memoId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO, memoId],
    queryFn: () => MemoService.getById({ memoId: memoId! }),
    enabled: !!memoId,
  });

const useGetUserMemo = (attachedObjectType: AttachedObjectType, attachedObjectId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.USER_MEMO, attachedObjectType, attachedObjectId],
    queryFn: () =>
      MemoService.getUserMemoByAttachedObjectId({ attachedObjectType, attachedObjectId: attachedObjectId! }),
    enabled: !!attachedObjectId,
    retry: false,
  });

const useGetOrCreateProjectUserMemo = (projectId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.USER_MEMO, AttachedObjectType.PROJECT, projectId],
    queryFn: () =>
      ProjectService.getOrCreateUserMemo({
        projId: projectId!,
      }),
    retry: false,
    enabled: !!projectId,
  });

const useGetObjectMemos = (attachedObjectType: AttachedObjectType, attachedObjectId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.OBJECT_MEMOS, attachedObjectType, attachedObjectId],
    queryFn: () => MemoService.getMemosByAttachedObjectId({ attachedObjectType, attachedObjectId: attachedObjectId! }),
    enabled: !!attachedObjectId,
    retry: false,
  });

// MEMO MUTATIONS
const useCreateMemo = () =>
  useMutation({
    mutationFn: MemoService.addMemo,
    onSuccess: (data) => {
      queryClient.setQueryData<MemoRead>([QueryKey.MEMO, data.id], data);
      queryClient.setQueryData<MemoRead>(
        [QueryKey.USER_MEMO, data.attached_object_type, data.attached_object_id],
        data,
      );
      queryClient.setQueryData<MemoRead[]>(
        [QueryKey.OBJECT_MEMOS, data.attached_object_type, data.attached_object_id],
        (oldData) => (oldData ? [...oldData, data] : [data]),
      );
    },
  });

const updateInvalidation = (data: MemoRead) => {
  queryClient.setQueryData<MemoRead>([QueryKey.MEMO, data.id], data);
  queryClient.setQueryData<MemoRead>([QueryKey.USER_MEMO, data.attached_object_type, data.attached_object_id], data);
  queryClient.setQueryData<MemoRead[]>(
    [QueryKey.OBJECT_MEMOS, data.attached_object_type, data.attached_object_id],
    (oldData) => (oldData ? oldData.map((memo) => (memo.id === data.id ? data : memo)) : [data]),
  );
};

const useUpdateMemo = () =>
  useMutation({
    mutationFn: MemoService.updateById,
    onSuccess: (data) => {
      updateInvalidation(data);
      queryClient.invalidateQueries({ queryKey: ["search-memo-table-data"] });
    },
  });

const useStarMemos = () =>
  useMutation({
    mutationFn: ({ memoIds, isStarred }: { memoIds: number[]; isStarred: boolean }) => {
      const promises = memoIds.map((memoId) => MemoService.updateById({ memoId, requestBody: { starred: isStarred } }));
      return Promise.all(promises);
    },
    onSuccess: (memos) => {
      memos.forEach((memo) => {
        updateInvalidation(memo);
      });
      queryClient.invalidateQueries({ queryKey: ["search-memo-table-data"] });
    },
  });

const deleteInvalidation = (data: MemoRead) => {
  queryClient.removeQueries({ queryKey: [QueryKey.MEMO, data.id] });
  queryClient.removeQueries({ queryKey: [QueryKey.USER_MEMO, data.attached_object_type, data.attached_object_id] });
  queryClient.setQueryData<MemoRead[]>(
    [QueryKey.OBJECT_MEMOS, data.attached_object_type, data.attached_object_id],
    (oldData) => (oldData ? oldData.filter((memo) => memo.id !== data.id) : oldData),
  );
};

const useDeleteMemo = () =>
  useMutation({
    mutationFn: MemoService.deleteById,
    onSuccess: (data) => {
      deleteInvalidation(data);
      queryClient.invalidateQueries({ queryKey: ["search-memo-table-data"] });
    },
  });

const useDeleteMemos = () =>
  useMutation({
    mutationFn: ({ memoIds }: { memoIds: number[] }) => {
      const promises = memoIds.map((memoId) => MemoService.deleteById({ memoId }));
      return Promise.all(promises);
    },
    onSuccess: (memos) => {
      memos.forEach((data) => {
        deleteInvalidation(data);
      });
      queryClient.invalidateQueries({ queryKey: ["search-memo-table-data"] });
    },
  });

const MemoHooks = {
  useGetMemo,
  useGetObjectMemos,
  useGetOrCreateProjectUserMemo,
  useGetUserMemo,
  useCreateMemo,
  useUpdateMemo,
  useStarMemos,
  useDeleteMemo,
  useDeleteMemos,
};

export default MemoHooks;
