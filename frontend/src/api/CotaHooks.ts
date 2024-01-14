import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient";
import { QueryKey } from "./QueryKey";
import { COTARead, COTARefinementJobRead, ConceptOverTimeAnalysisService } from "./openapi";

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
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.COTA, data.id]);
      queryClient.invalidateQueries([QueryKey.COTAS_PROJECT_USER, data.project_id, data.user_id]);
    },
  });

const useUpdateCota = () =>
  useMutation(ConceptOverTimeAnalysisService.updateById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.COTA, data.id]);
      queryClient.invalidateQueries([QueryKey.COTAS_PROJECT_USER, data.project_id, data.user_id]);
    },
  });

const useDeleteCota = () =>
  useMutation(ConceptOverTimeAnalysisService.deleteById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.COTA, data.id]);
      queryClient.invalidateQueries([QueryKey.COTAS_PROJECT_USER, data.project_id, data.user_id]);
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
    onSuccess: (data) => {
      // TODO: Need backend changes
      // queryClient.invalidateQueries([QueryKey.COTA_REFINEMENT_JOB, data.cota_id]);
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
};

export default CotaHooks;
