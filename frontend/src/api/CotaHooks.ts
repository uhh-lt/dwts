import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient";
import { QueryKey } from "./QueryKey";
import { BackgroundJobStatus, COTARead, COTARefinementJobRead, ConceptOverTimeAnalysisService } from "./openapi";

const useGetCota = (cotaId: number | null | undefined) =>
  useQuery<COTARead, Error>(
    [QueryKey.COTA, cotaId],
    async () => {
      const data = await ConceptOverTimeAnalysisService.getById({ cotaId: cotaId! });
      return data;
    },
    {
      retry: false,
      enabled: !!cotaId,
      select: (data) => data,
    },
  );

const useGetUserCotas = (projectId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<COTARead[], Error>(
    [QueryKey.COTAS_PROJECT_USER, projectId, userId],
    async () => {
      const data = await ConceptOverTimeAnalysisService.getByProjectAndUser({ projectId: projectId!, userId: userId! });
      return data;
    },
    {
      retry: false,
      enabled: !!projectId && !!userId,
    },
  );

const useCreateCota = () =>
  useMutation(ConceptOverTimeAnalysisService.create, {
    onSuccess: (cota) => {
      queryClient.invalidateQueries([QueryKey.COTA, cota.id]);
      queryClient.invalidateQueries([QueryKey.COTAS_PROJECT_USER, cota.project_id, cota.user_id]);
    },
  });

const useUpdateCota = () =>
  useMutation(ConceptOverTimeAnalysisService.updateById, {
    onSuccess: (cota) => {
      queryClient.invalidateQueries([QueryKey.COTA, cota.id]);
      queryClient.invalidateQueries([QueryKey.COTAS_PROJECT_USER, cota.project_id, cota.user_id]);
    },
  });

const useDeleteCota = () =>
  useMutation(ConceptOverTimeAnalysisService.deleteById, {
    onSuccess: (cota) => {
      queryClient.invalidateQueries([QueryKey.COTA, cota.id]);
      queryClient.invalidateQueries([QueryKey.COTAS_PROJECT_USER, cota.project_id, cota.user_id]);
    },
  });

const useGetRefinementJob = (refinementJobId: string | null | undefined) =>
  useQuery<COTARefinementJobRead, Error>(
    [QueryKey.COTA_REFINEMENT_JOB, refinementJobId],
    () => ConceptOverTimeAnalysisService.getCotaJob({ cotaJobId: refinementJobId! }),
    {
      retry: false,
      enabled: !!refinementJobId,
    },
  );

const useRefineCota = () =>
  useMutation(ConceptOverTimeAnalysisService.refineCotaById, {
    onSuccess: (cotaRefinementJob) => {
      queryClient.invalidateQueries([QueryKey.COTA_REFINEMENT_JOB, cotaRefinementJob.id]);
      queryClient.invalidateQueries([QueryKey.COTA_MOST_RECENT_REFINEMENT_JOB, cotaRefinementJob.cota.id]);
    },
  });

const useResetCota = () =>
  useMutation(ConceptOverTimeAnalysisService.resetCota, {
    onSuccess: (cota) => {
      queryClient.invalidateQueries([QueryKey.COTA, cota.id]);
      queryClient.invalidateQueries([QueryKey.COTAS_PROJECT_USER, cota.project_id, cota.user_id]);
      queryClient.invalidateQueries([QueryKey.COTA_MOST_RECENT_REFINEMENT_JOB, cota.id]);
    },
  });

const usePollMostRecentRefinementJob = (cotaId: number | undefined) => {
  return useQuery<COTARefinementJobRead | null, Error>(
    [QueryKey.COTA_MOST_RECENT_REFINEMENT_JOB, cotaId],
    () =>
      ConceptOverTimeAnalysisService.getMostRecentCotaJob({
        cotaId: cotaId!,
      }),
    {
      enabled: !!cotaId,
      refetchInterval(cotaRefinementJob, query) {
        if (cotaRefinementJob?.status) {
          switch (cotaRefinementJob.status) {
            case BackgroundJobStatus.ERRORNEOUS:
            case BackgroundJobStatus.FINISHED:
              return false;
            case BackgroundJobStatus.WAITING:
            case BackgroundJobStatus.RUNNING:
              return 1000;
          }
        }
        return false;
      },
    },
  );
};

const useAnnotateCotaSentences = () =>
  useMutation(ConceptOverTimeAnalysisService.annotateCotaSentence, {
    onSuccess: (cota) => {
      queryClient.invalidateQueries([QueryKey.COTA, cota.id]);
      queryClient.invalidateQueries([QueryKey.COTAS_PROJECT_USER, cota.project_id, cota.user_id]);
    },
  });

const useRemoveCotaSentences = () =>
  useMutation(ConceptOverTimeAnalysisService.removeCotaSentence, {
    onSuccess: (cota) => {
      queryClient.invalidateQueries([QueryKey.COTA, cota.id]);
      queryClient.invalidateQueries([QueryKey.COTAS_PROJECT_USER, cota.project_id, cota.user_id]);
    },
  });

const CotaHooks = {
  useGetCota,
  useGetUserCotas,
  useCreateCota,
  useUpdateCota,
  useDeleteCota,
  useGetRefinementJob,
  useRefineCota,
  useResetCota,
  usePollMostRecentRefinementJob,
  useAnnotateCotaSentences,
  useRemoveCotaSentences,
};

export default CotaHooks;
