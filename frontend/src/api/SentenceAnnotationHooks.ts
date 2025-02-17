import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/useAuth.ts";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { CancelablePromise } from "./openapi/core/CancelablePromise.ts";
import { SentenceAnnotationRead } from "./openapi/models/SentenceAnnotationRead.ts";
import { SentenceAnnotationUpdate } from "./openapi/models/SentenceAnnotationUpdate.ts";
import { SentenceAnnotatorResult } from "./openapi/models/SentenceAnnotatorResult.ts";
import { SentenceAnnotationService } from "./openapi/services/SentenceAnnotationService.ts";
import { SourceDocumentService } from "./openapi/services/SourceDocumentService.ts";

export const FAKE_SENTENCE_ANNOTATION_ID = -1;

// SENTENCE QUERIES
const useGetSentenceAnnotator = (sdocId: number | null | undefined, userId: number | null | undefined) => {
  // TODO: filter out all disabled code ids
  return useQuery<SentenceAnnotatorResult, Error>({
    queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR, sdocId, userId],
    queryFn: () =>
      SourceDocumentService.getSentenceAnnotator({
        sdocId: sdocId!,
        userId: userId!,
      }),
    enabled: !!sdocId && !!userId,
  });
};

const useGetAnnotation = (sentenceAnnoId: number | undefined) =>
  useQuery<SentenceAnnotationRead, Error>({
    queryKey: [QueryKey.SENTENCE_ANNOTATION, sentenceAnnoId],
    queryFn: () =>
      SentenceAnnotationService.getById({
        sentenceAnnoId: sentenceAnnoId!,
      }) as CancelablePromise<SentenceAnnotationRead>,
    enabled: !!sentenceAnnoId,
  });

// SENTENCE MUTATIONS
const useCreateSentenceAnnotation = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: SentenceAnnotationService.addSentenceAnnotation,
    // optimistic update:
    // 1. Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    // 2. Snapshot the previous value
    // 3. Optimistically update to the new value
    // 4. Return a context object with the snapshotted value
    onMutate: async ({ requestBody: newSentAnno }) => {
      if (!user) return;
      const affectedQueryKey = [QueryKey.SDOC_SENTENCE_ANNOTATOR, newSentAnno.sdoc_id, user.id];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousSentenceAnnotator = queryClient.getQueryData<SentenceAnnotatorResult>(affectedQueryKey);
      const sentAnno: SentenceAnnotationRead = {
        ...newSentAnno,
        id: FAKE_SENTENCE_ANNOTATION_ID,
        user_id: user.id,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      queryClient.setQueryData<SentenceAnnotatorResult>(affectedQueryKey, (old) => {
        if (!old) return old;
        const sentAnnos = { ...old.sentence_annotations };
        for (let sentenceId = newSentAnno.sentence_id_start; sentenceId <= newSentAnno.sentence_id_end; sentenceId++) {
          if (!sentAnnos[sentenceId]) {
            sentAnnos[sentenceId] = [];
          }
          sentAnnos[sentenceId].push(sentAnno);
        }
        return { sentence_annotations: sentAnnos };
      });
      return { previousSentenceAnnotator, affectedQueryKey };
    },
    onError: (_error: Error, _newSentAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SentenceAnnotatorResult>(context.affectedQueryKey, context.previousSentenceAnnotator);
    },
    onSuccess: (data) => {
      queryClient.setQueryData<SentenceAnnotationRead>([QueryKey.SENTENCE_ANNOTATION, data.id], data);
      // Replace the fake sentence annotation with the real one
      queryClient.setQueryData<SentenceAnnotatorResult>(
        [QueryKey.SDOC_SENTENCE_ANNOTATOR, data.sdoc_id, data.user_id],
        (old) => {
          if (!old) return old;
          const sentAnnos = { ...old.sentence_annotations };
          for (let sentenceId = data.sentence_id_start; sentenceId <= data.sentence_id_end; sentenceId++) {
            if (!sentAnnos[sentenceId]) {
              sentAnnos[sentenceId] = [];
            }
            sentAnnos[sentenceId] = sentAnnos[sentenceId].map((annotation) =>
              annotation.id === FAKE_SENTENCE_ANNOTATION_ID ? data : annotation,
            );
          }
          return { sentence_annotations: sentAnnos };
        },
      );
    },
    meta: {
      successMessage: (data: SentenceAnnotationRead) => `Created Sentence Annotation ${data.id}`,
    },
  });
};

const useCreateBulkSentenceAnnotation = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: SentenceAnnotationService.addSentenceAnnotationsBulk,
    // optimistic updates
    onMutate: async ({ requestBody: annotationsToCreate }) => {
      if (!user) return;
      if (annotationsToCreate.length === 0) return;
      const sdocId = annotationsToCreate[0].sdoc_id;
      if (annotationsToCreate.some((annotation) => annotation.sdoc_id !== sdocId)) {
        console.error("All annotations to create must belong to the same source document");
        return;
      }

      const affectedQueryKey = [QueryKey.SDOC_SENTENCE_ANNOTATOR, sdocId, user.id];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousSentenceAnnotator = queryClient.getQueryData<SentenceAnnotatorResult>(affectedQueryKey);
      let fakeID = FAKE_SENTENCE_ANNOTATION_ID;
      queryClient.setQueryData<SentenceAnnotatorResult>(affectedQueryKey, (old) => {
        if (!old) return old;
        const sentAnnos = { ...old.sentence_annotations };
        annotationsToCreate.forEach((data) => {
          const sentAnno: SentenceAnnotationRead = {
            ...data,
            id: fakeID,
            user_id: user.id,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          };
          for (let sentenceId = data.sentence_id_start; sentenceId <= data.sentence_id_end; sentenceId++) {
            if (!sentAnnos[sentenceId]) {
              sentAnnos[sentenceId] = [];
            }
            sentAnnos[sentenceId].push(sentAnno);
          }
          fakeID = fakeID - 1;
        });
        return { sentence_annotations: sentAnnos };
      });
      return { previousSentenceAnnotator, affectedQueryKey };
    },
    onError: (_error: Error, _newSentAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.affectedQueryKey, context.previousSentenceAnnotator);
    },
    // Always re-fetch after error or success:
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return;
      queryClient.invalidateQueries({ queryKey: context.affectedQueryKey });
    },
  });
};

const useUpdateSentenceAnnotation = () =>
  useMutation({
    mutationFn: (variables: {
      sentenceAnnoToUpdate: SentenceAnnotationRead | number;
      update: SentenceAnnotationUpdate;
    }) =>
      SentenceAnnotationService.updateById({
        sentenceAnnoId:
          typeof variables.sentenceAnnoToUpdate === "number"
            ? variables.sentenceAnnoToUpdate
            : variables.sentenceAnnoToUpdate.id,
        requestBody: variables.update,
      }),
    // optimistic update if sentenceAnnoToUpdate is a SentenceAnnotationRead
    onMutate: async ({ sentenceAnnoToUpdate, update }) => {
      if (typeof sentenceAnnoToUpdate === "number") return;
      const affectedQueryKey = [
        QueryKey.SDOC_SENTENCE_ANNOTATOR,
        sentenceAnnoToUpdate.sdoc_id,
        sentenceAnnoToUpdate.user_id,
      ];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousAnnos = queryClient.getQueryData<SentenceAnnotatorResult>(affectedQueryKey);
      queryClient.setQueryData<SentenceAnnotatorResult>(affectedQueryKey, (old) => {
        if (!old) return old;
        const sentAnnos = { ...old.sentence_annotations };
        for (
          let sentenceId = sentenceAnnoToUpdate.sentence_id_start;
          sentenceId <= sentenceAnnoToUpdate.sentence_id_end;
          sentenceId++
        ) {
          if (!sentAnnos[sentenceId]) {
            sentAnnos[sentenceId] = [];
          }
          sentAnnos[sentenceId] = sentAnnos[sentenceId].map((annotation) =>
            annotation.id === sentenceAnnoToUpdate.id ? { ...annotation, ...update } : annotation,
          );
        }
        return { sentence_annotations: sentAnnos };
      });
      return { previousAnnos, affectedQueryKey };
    },
    onError: (_error: Error, _updatedSentenceAnnotation, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SentenceAnnotatorResult>(context.affectedQueryKey, context.previousAnnos);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SENT_ANNO_TABLE] }); // TODO: This is not optimal, shoudl be projectId, selectedUserId... We do this because of SentenceAnnotationTable
      queryClient.setQueryData<SentenceAnnotationRead>([QueryKey.SENTENCE_ANNOTATION, data.id], data);
      queryClient.setQueryData<SentenceAnnotatorResult>(
        [QueryKey.SDOC_SENTENCE_ANNOTATOR, data.sdoc_id, data.user_id],
        (old) => {
          if (!old) return old;
          const sentAnnos = { ...old.sentence_annotations };
          for (let sentenceId = data.sentence_id_start; sentenceId <= data.sentence_id_end; sentenceId++) {
            if (!sentAnnos[sentenceId]) {
              sentAnnos[sentenceId] = [];
            }
            sentAnnos[sentenceId] = sentAnnos[sentenceId].map((annotation) =>
              annotation.id === data.id ? data : annotation,
            );
          }
          return { sentence_annotations: sentAnnos };
        },
      );
    },
    meta: {
      successMessage: (data: SentenceAnnotationRead) => `Updated Sentence Annotation ${data.id}`,
    },
  });

const useUpdateBulkSentenceAnno = () =>
  useMutation({
    mutationFn: SentenceAnnotationService.updateSentAnnoAnnotationsBulk,
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SENT_ANNO_TABLE] }); // TODO: This is not optimal, shoudl be projectId, selectedUserId... We do this because of SentenceAnnotationTable
      data.forEach((annotation) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR, annotation.sdoc_id] });
        queryClient.invalidateQueries({ queryKey: [QueryKey.SENTENCE_ANNOTATION, annotation.id] });
      });
    },
  });

const useDeleteSentenceAnnotation = () =>
  useMutation({
    mutationFn: (sentAnnoToDelete: SentenceAnnotationRead) =>
      SentenceAnnotationService.deleteById({ sentenceAnnoId: sentAnnoToDelete.id }),
    // optimistic updates
    onMutate: async (sentAnnoToDelete) => {
      const affectedQueryKey = [QueryKey.SDOC_SENTENCE_ANNOTATOR, sentAnnoToDelete.sdoc_id, sentAnnoToDelete.user_id];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousSentenceAnnotator = queryClient.getQueryData<SentenceAnnotatorResult>(affectedQueryKey);
      queryClient.setQueryData<SentenceAnnotatorResult>(affectedQueryKey, (old) => {
        if (!old) return old;
        const sentAnnos = { ...old.sentence_annotations };
        for (
          let sentenceId = sentAnnoToDelete.sentence_id_start;
          sentenceId <= sentAnnoToDelete.sentence_id_end;
          sentenceId++
        ) {
          if (!sentAnnos[sentenceId]) continue;
          sentAnnos[sentenceId] = sentAnnos[sentenceId].filter((annotation) => annotation.id !== sentAnnoToDelete.id);
        }
        return { sentence_annotations: sentAnnos };
      });
      return { previousSentenceAnnotator, affectedQueryKey };
    },
    onError: (_error: Error, _sentenceAnnotationToDelete, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SentenceAnnotatorResult>(context.affectedQueryKey, context.previousSentenceAnnotator);
    },
    meta: {
      successMessage: (data: SentenceAnnotationRead) => `Deleted Sentence Annotation ${data.id}`,
    },
  });

const useDeleteBulkSentenceAnnotation = () =>
  useMutation({
    mutationFn: (sentAnnosToDelete: SentenceAnnotationRead[]) =>
      SentenceAnnotationService.deleteBulkById({
        requestBody: sentAnnosToDelete.map((anno) => anno.id),
      }),
    // optimistic updates
    onMutate: async (sentAnnosToDelete) => {
      if (sentAnnosToDelete.length === 0) return;
      const sdocId = sentAnnosToDelete[0].sdoc_id;
      if (sentAnnosToDelete.some((annotation) => annotation.sdoc_id !== sdocId)) {
        console.error("All annotations to delete must belong to the same source document");
        return;
      }
      const userId = sentAnnosToDelete[0].user_id;
      if (sentAnnosToDelete.some((annotation) => annotation.user_id !== userId)) {
        console.error("All annotations to delete must belong to the same user");
        return;
      }

      const affectedQueryKey = [QueryKey.SDOC_SENTENCE_ANNOTATOR, sdocId, userId];
      await queryClient.cancelQueries({ queryKey: affectedQueryKey });
      const previousSentenceAnnotator = queryClient.getQueryData<SentenceAnnotatorResult>(affectedQueryKey);
      const idsToDelete = sentAnnosToDelete.map((anno) => anno.id);
      queryClient.setQueryData<SentenceAnnotatorResult>(affectedQueryKey, (old) => {
        if (!old) return old;
        const newSentenceAnnotations = Object.entries(old.sentence_annotations).reduce(
          (acc, [sentId, annotations]) => {
            // filter out the annotations that are to be deleted
            acc[sentId] = annotations.filter((annotation) => !idsToDelete.includes(annotation.id));
            return acc;
          },
          {} as Record<string, SentenceAnnotationRead[]>,
        );
        return { sentence_annotations: newSentenceAnnotations };
      });
      return { previousSentenceAnnotator, affectedQueryKey };
    },
    onError: (_error: Error, _sentenceAnnotationToDelete, context) => {
      if (!context) return;
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData<SentenceAnnotatorResult>(context.affectedQueryKey, context.previousSentenceAnnotator);
    },
    // Always re-fetch after error or success:
    onSettled: (_data, _error, _variables, context) => {
      if (!context) return;
      queryClient.invalidateQueries({ queryKey: context.affectedQueryKey });
    },
  });

const SentenceAnnotationHooks = {
  useGetSentenceAnnotator,
  useGetAnnotation,
  useCreateSentenceAnnotation,
  useCreateBulkSentenceAnnotation,
  useUpdateSentenceAnnotation,
  useUpdateBulkSentenceAnno,
  useDeleteSentenceAnnotation,
  useDeleteBulkSentenceAnnotation,
};

export default SentenceAnnotationHooks;
