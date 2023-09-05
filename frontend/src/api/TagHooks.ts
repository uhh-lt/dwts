import { useMutation, useQuery } from "@tanstack/react-query";
import { DocumentTagRead, DocumentTagService, MemoRead, SourceDocumentDocumentTagMultiLink } from "./openapi";
import { QueryKey } from "./QueryKey";
import { CheckboxState } from "../views/search/Tags/TagMenu/TagMenu";
import queryClient from "../plugins/ReactQueryClient";

// tags
const useGetTag = (tagId: number | undefined) =>
  useQuery<DocumentTagRead, Error>([QueryKey.TAG, tagId], () => DocumentTagService.getById({ tagId: tagId! }), {
    enabled: !!tagId,
  });

const useCreateTag = () =>
  useMutation(DocumentTagService.createNewDocTag, {
    onSuccess: (tag) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_TAGS, tag.project_id]);
    },
  });

const useUpdateTag = () =>
  useMutation(DocumentTagService.updateById, {
    onSuccess: (tag) => {
      queryClient.invalidateQueries([QueryKey.TAG, tag.id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_TAGS, tag.project_id]);
    },
  });

const useDeleteTag = () =>
  useMutation(DocumentTagService.deleteById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_TAGS, data.project_id]);
      queryClient.invalidateQueries([QueryKey.SDOC_TAGS]); // todo welche sdocs sind eigentlich genau affected?
    },
  });

const useBulkLinkDocumentTags = () =>
  useMutation(
    (variables: { projectId: number; requestBody: SourceDocumentDocumentTagMultiLink }) =>
      DocumentTagService.linkMultipleTags({ requestBody: variables.requestBody }),
    {
      onSuccess: (data, variables) => {
        // we need to invalidate the document tags for every document that we updated
        variables.requestBody.source_document_ids.forEach((sdocId) => {
          queryClient.invalidateQueries([QueryKey.SDOC_TAGS, sdocId]);
        });
        queryClient.invalidateQueries([QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, variables.projectId]);
        queryClient.invalidateQueries([QueryKey.SEARCH_TAG_STATISTICS]); // todo: zu unspezifisch!
      },
    }
  );

const useBulkUnlinkDocumentTags = () =>
  useMutation(
    (variables: { projectId: number; requestBody: SourceDocumentDocumentTagMultiLink }) =>
      DocumentTagService.unlinkMultipleTags({ requestBody: variables.requestBody }),
    {
      onSuccess: (data, variables) => {
        // we need to invalidate the document tags for every document that we updated
        variables.requestBody.source_document_ids.forEach((sdocId) => {
          queryClient.invalidateQueries([QueryKey.SDOC_TAGS, sdocId]);
        });
        queryClient.invalidateQueries([QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, variables.projectId]);
        queryClient.invalidateQueries([QueryKey.SEARCH_TAG_STATISTICS]); // todo: zu unspezifisch!
      },
    }
  );

const useBulkUpdateDocumentTags = () =>
  useMutation(
    async (variables: {
      projectId: number;
      sourceDocumentIds: number[];
      initialState: Map<number, CheckboxState>;
      newState: Map<number, CheckboxState>;
    }) => {
      let addTags: number[] = [];
      let removeTags: number[] = [];

      variables.initialState.forEach((value, key) => {
        let newValue = variables.newState.get(key);
        if (value === CheckboxState.CHECKED && newValue === CheckboxState.NOT_CHECKED) {
          removeTags.push(key);
        } else if (value === CheckboxState.NOT_CHECKED && newValue === CheckboxState.CHECKED) {
          addTags.push(key);
        } else if (value === CheckboxState.INDETERMINATE && newValue === CheckboxState.CHECKED) {
          addTags.push(key);
        } else if (value === CheckboxState.INDETERMINATE && newValue === CheckboxState.NOT_CHECKED) {
          removeTags.push(key);
        }
      });

      let calls = [];
      if (addTags.length > 0) {
        calls.push(
          DocumentTagService.linkMultipleTags({
            requestBody: {
              source_document_ids: variables.sourceDocumentIds,
              document_tag_ids: addTags,
            },
          })
        );
      }
      if (removeTags.length > 0) {
        DocumentTagService.unlinkMultipleTags({
          requestBody: {
            source_document_ids: variables.sourceDocumentIds,
            document_tag_ids: removeTags,
          },
        });
      }
      return await Promise.all(calls);
    },
    {
      onSuccess: (data, variables) => {
        // we need to invalidate the document tags for every document that we updated
        variables.sourceDocumentIds.forEach((sdocId) => {
          queryClient.invalidateQueries([QueryKey.SDOC_TAGS, sdocId]);
        });
        queryClient.invalidateQueries([QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, variables.projectId]);
        queryClient.invalidateQueries([QueryKey.SEARCH_TAG_STATISTICS]); // todo: zu unspezifisch!
      },
    }
  );

// memos
const useGetMemos = (tagId: number | undefined) =>
  useQuery<MemoRead[], Error>([QueryKey.MEMO_TAG, tagId], () => DocumentTagService.getMemos({ tagId: tagId! }), {
    retry: false,
    enabled: !!tagId,
  });

const useGetMemo = (tagId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.MEMO_TAG, tagId, userId],
    () => DocumentTagService.getUserMemos({ tagId: tagId!, userId: userId! }).then((memos) => memos[0]),
    {
      retry: false,
      enabled: !!tagId && !!userId,
    }
  );

const useCreateMemo = () =>
  useMutation(DocumentTagService.addMemo, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, data.user_id]);
      queryClient.invalidateQueries([QueryKey.MEMO_TAG, data.attached_object_id, data.user_id]);
    },
  });

const TagHooks = {
  useGetTag,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useBulkUpdateDocumentTags,
  useBulkLinkDocumentTags,
  useBulkUnlinkDocumentTags,
  //memos
  useGetMemos,
  useGetMemo,
  useCreateMemo,
};

export default TagHooks;
