import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/useAuth.ts";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { SpanAnnotationCreate } from "./openapi/models/SpanAnnotationCreate.ts";
import { SpanAnnotationRead } from "./openapi/models/SpanAnnotationRead.ts";
import { SpanAnnotationUpdate } from "./openapi/models/SpanAnnotationUpdate.ts";
import { SourceDocumentService } from "./openapi/services/SourceDocumentService.ts";
import { SpanAnnotationService } from "./openapi/services/SpanAnnotationService.ts";
import { useSelectEnabledSpanAnnotations } from "./utils.ts";

export const FAKE_ANNOTATION_ID = -1;

// SPAN QUERIES
const useGetAnnotation = (spanId: number | null | undefined) =>
  useQuery<SpanAnnotationRead, Error>({
    queryKey: [QueryKey.SPAN_ANNOTATION, spanId],
    queryFn: () =>
      SpanAnnotationService.getById({
        spanId: spanId!,
      }) as Promise<SpanAnnotationRead>,
    enabled: !!spanId,
  });

const useGetByCodeAndUser = (codeId: number | null | undefined) =>
  useQuery<SpanAnnotationRead[], Error>({
    queryKey: [QueryKey.SPAN_ANNOTATIONS_USER_CODE, codeId],
    queryFn: () =>
      SpanAnnotationService.getByUserCode({
        codeId: codeId!,
      }),
    enabled: !!codeId,
  });

const useGetSpanAnnotationsBatch = (sdocId: number | null | undefined, userId: number | null | undefined) => {
  // filter out all disabled code ids
  const selectEnabledAnnotations = useSelectEnabledSpanAnnotations();
  return useQuery<SpanAnnotationRead[], Error>({
    queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, sdocId, userId],
    queryFn: () =>
      SourceDocumentService.getAllSpanAnnotationsBulk({
        sdocId: sdocId!,
        userId: userId!,
      }) as Promise<SpanAnnotationRead[]>,
    enabled: !!sdocId && !!userId,
    select: selectEnabledAnnotations,
  });
};

// SPAN MUTATIONS
const useCreateBulkAnnotations = () =>
  useMutation({
    mutationFn: SpanAnnotationService.addSpanAnnotationsBulk,
  });

const useCreateSpanAnnotation = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: (variables: SpanAnnotationCreate) =>
      SpanAnnotationService.addSpanAnnotation({ requestBody: variables }),
    // optimistic update:
    // 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    // 2. Snapshot the previous value
    // 3. Optimistically update to the new value
    // 4. Return a context object with the snapshotted value
    onMutate: async (newSpanAnnotation) => {
      if (!user) return;
      const affectedQueryKey = [QueryKey.SDOC_SPAN_ANNOTATIONS, newSpanAnnotation.sdoc_id, user.id];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousSpanAnnotations = queryClient.getQueryData<SpanAnnotationRead[]>(affectedQueryKey);
      const spanAnno: SpanAnnotationRead = {
        ...newSpanAnnotation,
        id: FAKE_ANNOTATION_ID,
        code_id: newSpanAnnotation.code_id,
        user_id: user.id,
        text: "",
        created: "",
        updated: "",
      };
      queryClient.setQueryData<SpanAnnotationRead[]>(affectedQueryKey, (old) => {
        // check if there is already a fake annotation, if so, replace it with the new one
        const fakeAnnotationIndex = old?.findIndex((a) => a.id === FAKE_ANNOTATION_ID);
        if (fakeAnnotationIndex !== undefined && fakeAnnotationIndex !== -1) {
          const result = Array.from(old!);
          result[fakeAnnotationIndex] = spanAnno;
          return result;
        }
        // if there is no fake annotation, add the new one
        return old ? [...old, spanAnno] : [spanAnno];
      });
      return { previousSpanAnnotations, affectedQueryKey };
    },
    onError: (_error: Error, _newSpanAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SpanAnnotationRead[]>(context.affectedQueryKey, context.previousSpanAnnotations);
    },
    onSuccess: (data) => {
      queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, data.id], data);
      // Replace the fake span with the real one
      queryClient.setQueryData<SpanAnnotationRead[]>(
        [QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id, data.user_id],
        (old) => (old ? old.map((span) => (span.id === FAKE_ANNOTATION_ID ? data : span)) : [data]),
      );
    },
    meta: {
      successMessage: (data: SpanAnnotationRead) => `Created Span Annotation ${data.id}`,
    },
  });
};

const useUpdateSpanAnnotation = () =>
  useMutation({
    mutationFn: (variables: {
      spanAnnotationToUpdate: SpanAnnotationRead | number;
      requestBody: SpanAnnotationUpdate;
    }) =>
      SpanAnnotationService.updateById({
        spanId:
          typeof variables.spanAnnotationToUpdate === "number"
            ? variables.spanAnnotationToUpdate
            : variables.spanAnnotationToUpdate.id,
        requestBody: variables.requestBody,
      }),
    // optimistic update if spanAnnotationToUpdate is a proper SpanAnnotationRead
    // todo: rework to only update QueryKey.SPAN_ANNOTATION (we need to change the rendering for this...)
    onMutate: async ({ spanAnnotationToUpdate, requestBody }) => {
      if (typeof spanAnnotationToUpdate === "number") return;
      const affectedQueryKey = [
        QueryKey.SDOC_SPAN_ANNOTATIONS,
        spanAnnotationToUpdate.sdoc_id,
        spanAnnotationToUpdate.user_id,
      ];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousAnnos = queryClient.getQueryData<SpanAnnotationRead[]>(affectedQueryKey);
      queryClient.setQueryData<SpanAnnotationRead[]>(affectedQueryKey, (old) => {
        return old
          ? old.map((anno) =>
              anno.id === spanAnnotationToUpdate.id
                ? {
                    ...anno,
                    code_id: requestBody.code_id,
                  }
                : anno,
            )
          : undefined;
      });
      return { previousAnnos, affectedQueryKey };
    },
    onError: (_error: Error, _updatedSpanAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SpanAnnotationRead[]>(context.affectedQueryKey, context.previousAnnos);
    },
    onSuccess: (data) => {
      queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, data.id], data);
      queryClient.setQueryData<SpanAnnotationRead[]>(
        [QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id, data.user_id],
        (old) => (old ? old.map((span) => (span.id === data.id ? data : span)) : [data]),
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNO_TABLE] }); // TODO: This is not optimal, shoudl be projectId, selectedUserId... We do this because of SpanAnnotationTable
    },
    meta: {
      successMessage: (data: SpanAnnotationRead) => `Updated Span Annotation ${data.id}`,
    },
  });

const useUpdateBulkSpan = () =>
  useMutation({
    mutationFn: SpanAnnotationService.updateSpanAnnotationsBulk,
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SPAN_ANNO_TABLE] }); // TODO: This is not optimal, shoudl be projectId, selectedUserId... We do this because of SpanAnnotationTable
      data.forEach((annotation) => {
        queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, annotation.id], annotation);
      });

      // Update SDOC_SPAN_ANNOTATIONS queries
      // 1. Group annotations by sdoc_id and user_id
      const annotationsByDocAndUser = data.reduce(
        (acc, annotation) => {
          const key = `${annotation.sdoc_id}-${annotation.user_id}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(annotation);
          return acc;
        },
        {} as Record<string, SpanAnnotationRead[]>,
      );
      // 2. Update the queries
      Object.entries(annotationsByDocAndUser).forEach(([key, annotations]) => {
        const [sdoc_id, user_id] = key.split("-").map(Number);
        queryClient.setQueryData<SpanAnnotationRead[]>([QueryKey.SDOC_SPAN_ANNOTATIONS, sdoc_id, user_id], (old) => {
          const oldMap = old ? new Map(old.map((span) => [span.id, span])) : new Map();
          annotations.forEach((annotation) => {
            oldMap.set(annotation.id, annotation);
          });
          return Array.from(oldMap.values());
        });
      });
    },
  });

const useDeleteSpanAnnotation = () =>
  useMutation({
    mutationFn: (variables: { spanAnnotationToDelete: SpanAnnotationRead | number }) =>
      SpanAnnotationService.deleteById({
        spanId:
          typeof variables.spanAnnotationToDelete === "number"
            ? variables.spanAnnotationToDelete
            : variables.spanAnnotationToDelete.id,
      }),
    // optimistic updates if spanAnnotationToDelete is a proper SpanAnnotationRead
    onMutate: async ({ spanAnnotationToDelete }) => {
      if (typeof spanAnnotationToDelete === "number") return;
      const affectedQueryKey = [
        QueryKey.SDOC_SPAN_ANNOTATIONS,
        spanAnnotationToDelete.sdoc_id,
        spanAnnotationToDelete.user_id,
      ];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousSpanAnnotations = queryClient.getQueryData<SpanAnnotationRead[]>(affectedQueryKey);
      queryClient.setQueryData<SpanAnnotationRead[]>(affectedQueryKey, (old) =>
        old ? old.filter((spanAnnotation) => spanAnnotation.id !== spanAnnotationToDelete.id) : old,
      );
      return { previousSpanAnnotations, affectedQueryKey };
    },
    onError: (_error: Error, _spanAnnotationToDelete, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SpanAnnotationRead[]>(context.affectedQueryKey, context.previousSpanAnnotations);
    },
    onSuccess: (data) => {
      queryClient.removeQueries({ queryKey: [QueryKey.SPAN_ANNOTATION, data.id] });
      queryClient.setQueryData<SpanAnnotationRead[]>(
        [QueryKey.SDOC_SPAN_ANNOTATIONS, data.sdoc_id, data.user_id],
        (old) => (old ? old.filter((span) => span.id !== data.id) : old),
      );
    },
    meta: {
      successMessage: (data: SpanAnnotationRead) => `Deleted Span Annotation ${data.id}`,
    },
  });

const SpanAnnotationHooks = {
  useCreateSpanAnnotation,
  useCreateBulkAnnotations,
  useGetSpanAnnotationsBatch,
  useGetAnnotation,
  useGetByCodeAndUser,
  useUpdateSpanAnnotation,
  useUpdateBulkSpan,
  useDeleteSpanAnnotation,
};

export default SpanAnnotationHooks;
