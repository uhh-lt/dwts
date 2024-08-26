import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";

import { useAuth } from "../auth/useAuth.ts";
import { ActionQueryParameters } from "./openapi/models/ActionQueryParameters.ts";
import { ActionRead } from "./openapi/models/ActionRead.ts";
import { CodeRead } from "./openapi/models/CodeRead.ts";
import { DocumentTagRead } from "./openapi/models/DocumentTagRead.ts";
import { EntityRead } from "./openapi/models/EntityRead.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { PreprocessingJobRead } from "./openapi/models/PreprocessingJobRead.ts";
import { ProjectCreate } from "./openapi/models/ProjectCreate.ts";
import { ProjectMetadataRead } from "./openapi/models/ProjectMetadataRead.ts";
import { ProjectRead } from "./openapi/models/ProjectRead.ts";
import { ProjectUpdate } from "./openapi/models/ProjectUpdate.ts";
import { UserRead } from "./openapi/models/UserRead.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";
import { useSelectEnabledCodes } from "./utils.ts";

//tags
const useGetAllTags = (projectId: number) =>
  useQuery<DocumentTagRead[], Error>({
    queryKey: [QueryKey.PROJECT_TAGS, projectId],
    queryFn: () =>
      ProjectService.getProjectTags({
        projId: projectId,
      }),
    select: (tag) => {
      const arrayForSort = [...tag];
      return arrayForSort.sort((a, b) => a.id - b.id);
    },
  });

const useGetProject = (projectId: number | null | undefined) =>
  useQuery<ProjectRead, Error>({
    queryKey: [QueryKey.PROJECT, projectId],
    queryFn: () =>
      ProjectService.readProject({
        projId: projectId!,
      }),
    enabled: !!projectId,
  });

// sdoc
const useUploadDocument = () =>
  useMutation({
    mutationFn: ProjectService.uploadProjectSdoc,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_SDOCS, variables.projId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_SDOCS_INFINITE, variables.projId] });
    },
    meta: {
      successMessage: (data: PreprocessingJobRead) =>
        `Successfully uploaded ${data.payloads.length} documents and started PreprocessingJob ${data.id} in the background!`,
    },
  });

const useCreateProject = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ requestBody }: { requestBody: ProjectCreate }) => {
      return await ProjectService.createNewProject({ requestBody });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_PROJECTS, user?.id] });
    },
    meta: {
      successMessage: (project: ProjectRead) =>
        "Successfully Created Project " + project.title + " with id " + project.id + "!",
    },
  });
};

const useUpdateProject = () =>
  useMutation({
    mutationFn: (variables: { userId: number; projId: number; requestBody: ProjectUpdate }) => {
      return ProjectService.updateProject({
        projId: variables.projId,
        requestBody: variables.requestBody,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_PROJECTS, variables.userId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT, data.id] });
    },
    meta: {
      successMessage: (data: ProjectRead) => `Successfully Updated Project with id ${data.id}!`,
    },
  });

const useDeleteProject = () =>
  useMutation({
    mutationFn: (variables: { userId: number; projId: number }) =>
      ProjectService.deleteProject({ projId: variables.projId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_PROJECTS, variables.userId] });
    },
    meta: {
      successMessage: (data: ProjectRead) => "Successfully Deleted Project " + data.title + " with id " + data.id + "!",
    },
  });

// users
const useGetAllUsers = (projectId: number | null | undefined) =>
  useQuery<UserRead[], Error>({
    queryKey: [QueryKey.PROJECT_USERS, projectId],
    queryFn: () =>
      ProjectService.getProjectUsers({
        projId: projectId!,
      }),
    enabled: !!projectId,
  });
const useAddUser = () =>
  useMutation({
    mutationFn: ProjectService.associateUserToProject,
    onSuccess: (user, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_USERS, variables.projId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_PROJECTS, user.id] });
    },
    meta: {
      successMessage: (user: UserRead) => "Successfully added user " + user.first_name + "!",
    },
  });

const useRemoveUser = () =>
  useMutation({
    mutationFn: ProjectService.dissociateUserFromProject,
    onSuccess: (user, variables) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_USERS, variables.projId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.USER_PROJECTS, user.id] });
    },
    meta: {
      successMessage: (data: UserRead) => "Successfully removed user " + data.first_name + "!",
    },
  });

// codes
const useGetAllCodes = (projectId: number, returnAll: boolean = false) => {
  const selectEnabledCodes = useSelectEnabledCodes();
  return useQuery<CodeRead[], Error>({
    queryKey: [QueryKey.PROJECT_CODES, projectId],
    queryFn: () =>
      ProjectService.getProjectCodes({
        projId: projectId,
      }),
    select: returnAll ? undefined : selectEnabledCodes,
  });
};
// entities
const useGetAllEntities = (projectId: number) => {
  return useQuery<EntityRead[], Error>({
    queryKey: [QueryKey.PROJECT_ENTITIES, projectId],
    queryFn: () =>
      ProjectService.getProjectEntities({
        projId: projectId,
      }),
  });
};
// memo
const useGetMemo = (projectId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_PROJECT, projectId, userId],
    queryFn: () =>
      ProjectService.getUserMemo({
        projId: projectId!,
        userId: userId!,
      }),
    retry: false,
    enabled: !!projectId && !!userId,
  });

const useGetAllUserMemos = (projectId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<MemoRead[], Error>({
    queryKey: [QueryKey.USER_MEMOS, projectId, userId],
    queryFn: () =>
      ProjectService.getUserMemosOfProject({
        projId: projectId!,
        userId: userId!,
      }),
    retry: false,
    enabled: !!projectId && !!userId,
  });

const useCreateMemo = () =>
  useMutation({
    mutationFn: ProjectService.addMemo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.MEMO_PROJECT, data.project_id, data.user_id] });
    },
  });

// actions
const useGetActions = (projectId: number, userId: number) =>
  useQuery<Array<ActionRead>, Error>({
    queryKey: [QueryKey.ACTION, projectId, userId],
    queryFn: () =>
      ProjectService.getUserActionsOfProject({
        projId: projectId,
        userId: userId,
      }),
    refetchOnWindowFocus: false,
  });

const useQueryActions = (requestBody: ActionQueryParameters) =>
  useQuery<ActionRead[], Error>({
    queryKey: [QueryKey.ACTIONS_QUERY, requestBody],
    queryFn: () =>
      ProjectService.queryActionsOfProject({
        requestBody: requestBody,
      }),
  });

// metadata
const useGetMetadata = (projectId: number) =>
  useQuery<ProjectMetadataRead[], Error>({
    queryKey: [QueryKey.PROJECT_METADATAS, projectId],
    queryFn: () =>
      ProjectService.getAllMetadata({
        projId: projectId,
      }),
  });

// duplicates
const useFindDuplicateTextDocuments = () => useMutation({ mutationFn: ProjectService.findDuplicateTextSdocs });

const ProjectHooks = {
  // tags
  useGetAllTags,
  // project
  useGetProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  // sdoc
  useUploadDocument,
  // users
  useGetAllUsers,
  useAddUser,
  useRemoveUser,
  // codes
  useGetAllCodes,
  // entities,
  useGetAllEntities,
  // memo
  useGetMemo,
  useGetAllUserMemos,
  useCreateMemo,
  // actions
  useGetActions,
  useQueryActions,
  // metadata
  useGetMetadata,
  // duplicates
  useFindDuplicateTextDocuments,
};

export default ProjectHooks;
