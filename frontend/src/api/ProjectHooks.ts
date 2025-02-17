import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";

import { PreprocessingJobRead } from "./openapi/models/PreprocessingJobRead.ts";
import { ProjectCreate } from "./openapi/models/ProjectCreate.ts";
import { ProjectRead } from "./openapi/models/ProjectRead.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";
import { UserService } from "./openapi/services/UserService.ts";

// PROJECT QUERIES
interface UseProjectsQueryParams<T> {
  select?: (data: ProjectRead[]) => T;
  enabled?: boolean;
}

const useProjectsQuery = <T = ProjectRead[]>({ select, enabled }: UseProjectsQueryParams<T>) =>
  useQuery({
    queryKey: [QueryKey.USER_PROJECTS],
    queryFn: () => UserService.getUserProjects(),
    staleTime: 1000 * 60 * 5,
    select,
    enabled,
  });

const useGetAllProjects = () => useProjectsQuery({});

const useGetProject = (projectId: number | null | undefined) =>
  useProjectsQuery({
    select: (data) => data.find((project) => project.id === projectId)!,
    enabled: !!projectId,
  });

// PROJECT MUTATIONS
const useCreateProject = () => {
  return useMutation({
    mutationFn: async ({ requestBody }: { requestBody: ProjectCreate }) => {
      return await ProjectService.createNewProject({ requestBody });
    },
    onSuccess: (data) => {
      queryClient.setQueryData<ProjectRead[]>([QueryKey.USER_PROJECTS], (oldData) =>
        oldData ? [...oldData, data] : [data],
      );
    },
    meta: {
      successMessage: (project: ProjectRead) =>
        "Successfully Created Project " + project.title + " with id " + project.id + "!",
    },
  });
};

const useUpdateProject = () =>
  useMutation({
    mutationFn: ProjectService.updateProject,
    onSuccess: (data) => {
      queryClient.setQueryData<ProjectRead[]>([QueryKey.USER_PROJECTS], (oldData) =>
        oldData ? oldData.map((project) => (project.id === data.id ? data : project)) : oldData,
      );
    },
    meta: {
      successMessage: (data: ProjectRead) => `Successfully Updated Project with id ${data.id}!`,
    },
  });

const useDeleteProject = () =>
  useMutation({
    mutationFn: ProjectService.deleteProject,
    onSuccess: (data) => {
      queryClient.setQueryData<ProjectRead[]>([QueryKey.USER_PROJECTS], (oldData) =>
        oldData ? oldData.filter((project) => project.id !== data.id) : oldData,
      );
    },
    meta: {
      successMessage: (data: ProjectRead) => "Successfully Deleted Project " + data.title + " with id " + data.id + "!",
    },
  });

// sdoc
const useUploadDocument = () =>
  useMutation({
    mutationFn: ProjectService.uploadProjectSdoc,
    meta: {
      successMessage: (data: PreprocessingJobRead) =>
        `Successfully uploaded ${data.payloads.length} documents and started PreprocessingJob ${data.id} in the background!`,
    },
  });

// duplicates
const useFindDuplicateTextDocuments = () => useMutation({ mutationFn: ProjectService.findDuplicateTextSdocs });

const ProjectHooks = {
  // project
  useGetAllProjects,
  useGetProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  // sdoc
  useUploadDocument,
  // duplicates
  useFindDuplicateTextDocuments,
};

export default ProjectHooks;
