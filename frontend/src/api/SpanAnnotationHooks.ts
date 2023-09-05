import { useMutation, useQuery } from "@tanstack/react-query";
import {
  MemoRead,
  SpanAnnotationRead,
  SpanAnnotationReadResolved,
  SpanAnnotationService,
  SpanAnnotationUpdateWithCodeId,
} from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";

export const FAKE_ANNOTATION_ID = -1;

const useCreateAnnotation = () =>
  useMutation(SpanAnnotationService.addSpanAnnotation, {
    // optimistic updates
    onMutate: async (newSpanAnnotation) => {
      // when we create a new span annotation, we add a new annotation to a certain annotation document
      // thus, we only affect the annotation document that we are adding to
      const affectedQueryKey = [QueryKey.ADOC_SPAN_ANNOTATIONS, newSpanAnnotation.requestBody.annotation_document_id];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(affectedQueryKey);

      // Snapshot the previous value
      const previousSpanAnnotations = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: SpanAnnotationReadResolved[] | undefined) => {
        const fakeAnnotationIndex = old?.findIndex((a) => a.id === FAKE_ANNOTATION_ID);
        if (fakeAnnotationIndex !== undefined && fakeAnnotationIndex !== -1) {
          const fakeAnnotation = old![fakeAnnotationIndex];
          // we already created a fake annotation, that is correct as is
          if (fakeAnnotation.code.id === newSpanAnnotation.requestBody.code_id) {
            return old;
          }
          // we already created a fake annotation, but the code is different
          const result = Array.from(old!);
          result[fakeAnnotationIndex] = {
            ...fakeAnnotation,
            code: {
              ...fakeAnnotation.code,
              id: newSpanAnnotation.requestBody.code_id,
            },
          };
          return result;
        }
        // we have not created a fake annotation yet
        const spanAnnotation = {
          ...newSpanAnnotation.requestBody,
          id: FAKE_ANNOTATION_ID,
          code: {
            name: "",
            color: "",
            description: "",
            id: newSpanAnnotation.requestBody.code_id,
            project_id: 0,
            user_id: 0,
            created: "",
            updated: "",
          },
          created: "",
          updated: "",
        };
        return old === undefined ? [spanAnnotation] : [...old, spanAnnotation];
      });

      // Return a context object with the snapshotted value
      return { previousSpanAnnotations, myCustomQueryKey: affectedQueryKey };
    },
    onError: (error: Error, newSpanAnnotation, context: any) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.myCustomQueryKey, context.previousSpanAnnotations);
    },
    // Always re-fetch after error or success:
    onSettled: (data, error, variables, context: any) => {
      queryClient.invalidateQueries(context.myCustomQueryKey);
    },
  });

const useGetAnnotation = (spanId: number | undefined) =>
  useQuery<SpanAnnotationReadResolved, Error>(
    [QueryKey.SPAN_ANNOTATION, spanId],
    () =>
      SpanAnnotationService.getById({
        spanId: spanId!,
        resolve: true,
      }) as Promise<SpanAnnotationReadResolved>,
    { enabled: !!spanId }
  );

const useUpdate = () =>
  useMutation(SpanAnnotationService.updateById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.SPAN_ANNOTATION, data.id]);
      queryClient.invalidateQueries([QueryKey.ADOC_SPAN_ANNOTATIONS, data.annotation_document_id]);
    },
  });

const useUpdateSpan = () =>
  useMutation(
    (variables: {
      spanAnnotationToUpdate: SpanAnnotationRead | SpanAnnotationReadResolved;
      requestBody: SpanAnnotationUpdateWithCodeId;
      resolve?: boolean | undefined;
    }) =>
      SpanAnnotationService.updateById({
        spanId: variables.spanAnnotationToUpdate.id,
        requestBody: variables.requestBody,
        resolve: variables.resolve,
      }),
    {
      // todo: rework to only update QueryKey.SPAN_ANNOTATION (we need to change the rendering for this...)
      // optimistic update
      onMutate: async (updateData) => {
        // when we update a span annotation, we update an annotation of a certain annotation document
        // thus, we only affect the annotation document that contains the annotation we update
        const affectedQueryKey = [
          QueryKey.ADOC_SPAN_ANNOTATIONS,
          updateData.spanAnnotationToUpdate.annotation_document_id,
        ];

        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries(affectedQueryKey);

        // Snapshot the previous value
        const previousAnnos = queryClient.getQueryData(affectedQueryKey);

        // Optimistically update to the new value
        queryClient.setQueryData(affectedQueryKey, (old: SpanAnnotationReadResolved[] | undefined) => {
          if (!old) {
            return undefined;
          }
          const oldSpanAnnotation = old.find((anno) => anno.id === updateData.spanAnnotationToUpdate.id);
          if (!oldSpanAnnotation) {
            console.error("Could not find span annotation to update");
            return old;
          }
          const oldSpanAnnotationIndex = old.indexOf(oldSpanAnnotation);
          const result = Array.from(old);
          result[oldSpanAnnotationIndex] = {
            ...oldSpanAnnotation,
            code: {
              ...oldSpanAnnotation.code,
              id: updateData.requestBody.code_id,
            },
          };
          return result;
        });

        // Return a context object with the snapshotted value
        return { previousAnnos, myCustomQueryKey: affectedQueryKey };
      },
      onError: (error: Error, updatedSpanAnnotation, context: any) => {
        // If the mutation fails, use the context returned from onMutate to roll back
        queryClient.setQueryData(context.myCustomQueryKey, context.previousAnnos);
      },
      // Always re-fetch after error or success:
      onSettled: (updatedSpanAnnotation, error, variables, context: any) => {
        if (updatedSpanAnnotation) {
          queryClient.invalidateQueries([QueryKey.SPAN_ANNOTATION, updatedSpanAnnotation.id]);
        }
        queryClient.invalidateQueries(context.myCustomQueryKey);
      },
    }
  );

const useDeleteSpan = () =>
  useMutation(
    (variables: { spanAnnotationToDelete: SpanAnnotationRead | SpanAnnotationReadResolved }) =>
      SpanAnnotationService.deleteById({ spanId: variables.spanAnnotationToDelete.id }),
    {
      // optimistic updates
      onMutate: async ({ spanAnnotationToDelete }) => {
        // when we delete a span annotation, we remove an annotation from a certain annotation document
        // thus, we only affect the annotation document that we are removing from
        const affectedQueryKey = [QueryKey.ADOC_SPAN_ANNOTATIONS, spanAnnotationToDelete.annotation_document_id];

        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries(affectedQueryKey);

        // Snapshot the previous value
        const previousSpanAnnotations = queryClient.getQueryData(affectedQueryKey);

        // Optimistically update to the new value
        queryClient.setQueryData(affectedQueryKey, (old: SpanAnnotationReadResolved[] | undefined) => {
          if (old === undefined) {
            return undefined;
          }

          return old.filter((spanAnnotation) => spanAnnotation.id !== spanAnnotationToDelete.id);
        });

        // Return a context object with the snapshotted value
        return { previousSpanAnnotations, myCustomQueryKey: affectedQueryKey };
      },
      onError: (error: Error, spanAnnotationToDelete, context: any) => {
        // If the mutation fails, use the context returned from onMutate to roll back
        queryClient.setQueryData(context.myCustomQueryKey, context.previousSpanAnnotations);
      },
      // Always re-fetch after error or success:
      onSettled: (data, error, variables, context: any) => {
        queryClient.invalidateQueries(context.myCustomQueryKey);
        queryClient.invalidateQueries([QueryKey.MEMO_SDOC_RELATED]); // todo: this is not optimal
      },
    }
  );

// memo
const useGetMemos = (spanId: number | undefined) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.MEMO_SPAN_ANNOTATION, spanId],
    () => SpanAnnotationService.getMemos({ spanId: spanId! }),
    { enabled: !!spanId, retry: false }
  );

const useGetMemo = (spanId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.MEMO_SPAN_ANNOTATION, spanId, userId],
    () => SpanAnnotationService.getUserMemos({ spanId: spanId!, userId: userId! }).then((memos) => memos[0]),
    { enabled: !!spanId && !!userId, retry: false }
  );

const useCreateMemo = () =>
  useMutation(SpanAnnotationService.addMemo, {
    onSuccess: (memo) => {
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, memo.user_id]);
      queryClient.invalidateQueries([QueryKey.MEMO_SPAN_ANNOTATION, memo.attached_object_id, memo.user_id]);
      queryClient.invalidateQueries([QueryKey.MEMO_SDOC_RELATED, memo.user_id]); // todo: this is not optimal
    },
  });

const SpanAnnotationHooks = {
  useCreateAnnotation,
  useGetAnnotation,
  useUpdateSpan,
  useUpdate,
  useDeleteSpan,
  // memo
  useGetMemos,
  useGetMemo,
  useCreateMemo,
};

export default SpanAnnotationHooks;
