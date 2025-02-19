import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { BackgroundJobStatus } from "./openapi/models/BackgroundJobStatus.ts";
import { MLJobRead } from "./openapi/models/MLJobRead.ts";
import { MlService } from "./openapi/services/MlService.ts";

const useStartMLJob = () =>
  useMutation({
    mutationFn: MlService.startMlJob,
    onSuccess: (job) => {
      // force refetch of all ml jobs when adding a new one
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_ML_JOBS, job.parameters.project_id] });
    },
    meta: {
      successMessage: (data: MLJobRead) => `Started ML Job as a new background task (ID: ${data.id})`,
    },
  });

const usePollMLJob = (mlJobId: string | undefined, initialData: MLJobRead | undefined) => {
  return useQuery<MLJobRead, Error>({
    queryKey: [QueryKey.ML_JOB, mlJobId],
    queryFn: () =>
      MlService.getMlJob({
        mlJobId: mlJobId!,
      }),
    enabled: !!mlJobId,
    refetchInterval: (query) => {
      if (!query.state.data) {
        return 1000;
      }
      if (query.state.data.status) {
        switch (query.state.data.status) {
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
    initialData,
  });
};

const useGetAllMLJobs = (projectId: number) => {
  return useQuery<MLJobRead[], Error>({
    queryKey: [QueryKey.PROJECT_ML_JOBS, projectId],
    queryFn: () =>
      MlService.getAllLmJobs({
        projectId: projectId!,
      }),
    enabled: !!projectId,
  });
};

const MLHooks = {
  usePollMLJob,
  useStartMLJob,
  useGetAllMLJobs,
};

export default MLHooks;
