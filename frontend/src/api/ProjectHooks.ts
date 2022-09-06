import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import {
  Body_upload_project_sdoc_project__proj_id__sdoc_put,
  CodeRead,
  DocumentTagRead,
  MemoCreate,
  MemoRead,
  ProjectCreate,
  ProjectRead,
  ProjectService,
  ProjectUpdate,
  SourceDocumentRead,
  UserRead,
} from "./openapi";
import { QueryKey } from "./QueryKey";

//tags
const useGetAllTags = (projectId: number) =>
  useQuery<DocumentTagRead[], Error>(
    [QueryKey.PROJECT_TAGS, projectId],
    () =>
      ProjectService.getProjectTagsProjectProjIdTagGet({
        projId: projectId,
      }),
    {
      select: (tag) => {
        const arrayForSort = [...tag];
        return arrayForSort.sort((a, b) => a.id - b.id);
      },
    }
  );

// project
const useGetAllProjects = () =>
  useQuery<ProjectRead[], Error>([QueryKey.PROJECTS], () => ProjectService.readAllProjectGet({}));
const useGetProject = (projectId: number) =>
  useQuery<ProjectRead, Error>([QueryKey.PROJECT, projectId], () =>
    ProjectService.readProjectProjectProjIdGet({
      projId: projectId,
    })
  );

// sdoc
const useUploadDocument = (
  options: UseMutationOptions<
    string,
    Error,
    { projId: number; formData: Body_upload_project_sdoc_project__proj_id__sdoc_put }
  >
) => useMutation(ProjectService.uploadProjectSdocProjectProjIdSdocPut, options);
const useGetProjectDocuments = (projectId: number) =>
  useQuery<SourceDocumentRead[], Error>([QueryKey.PROJECT_DOCUMENTS, projectId], () =>
    ProjectService.getProjectSdocsProjectProjIdSdocGet({
      projId: projectId,
    })
  );
const useCreateProject = (
  options: UseMutationOptions<ProjectRead, Error, { userId: number; requestBody: ProjectCreate }>
) =>
  useMutation(async ({ userId, requestBody }) => {
    const project = await ProjectService.createNewProjectProjectPut({ requestBody });
    await ProjectService.associateUserToProjectProjectProjIdUserUserIdPatch({
      projId: project.id,
      userId,
    });
    return project;
  }, options);
const useUpdateProject = (
  options: UseMutationOptions<ProjectRead, Error, { projId: number; requestBody: ProjectUpdate }>
) => useMutation(ProjectService.updateProjectProjectProjIdPatch, options);
const useDeleteProject = (options: UseMutationOptions<ProjectRead, Error, { projId: number }>) =>
  useMutation(ProjectService.deleteProjectProjectProjIdDelete, options);

// users
const useGetAllUsers = (projectId: number) =>
  useQuery<UserRead[], Error>([QueryKey.PROJECT_USERS, projectId], () =>
    ProjectService.getProjectUsersProjectProjIdUserGet({
      projId: projectId,
    })
  );
const useAddUser = (options: UseMutationOptions<UserRead, Error, { projId: number; userId: number }>) =>
  useMutation(ProjectService.associateUserToProjectProjectProjIdUserUserIdPatch, options);
const useRemoveUser = (options: UseMutationOptions<UserRead, Error, { projId: number; userId: number }>) =>
  useMutation(ProjectService.dissociateUserFromProjectProjectProjIdUserUserIdDelete, options);

// codes
const useGetAllCodes = (projectId: number) =>
  useQuery<CodeRead[], Error>(
    [QueryKey.PROJECT_CODES, projectId],
    () =>
      ProjectService.getProjectCodesProjectProjIdCodeGet({
        projId: projectId,
      }),
    {
      select: (codes) => {
        const arrayForSort = [...codes];
        return arrayForSort.sort((a, b) => a.id - b.id);
      },
    }
  );

// memo
const useGetMemo = (projectId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.PROJECT_MEMO, projectId, userId],
    () =>
      ProjectService.getUserMemoProjectProjIdMemoUserIdGet({
        projId: projectId!,
        userId: userId!,
      }),
    {
      retry: false,
      enabled: !!projectId && !!userId,
    }
  );

const useCreateMemo = (options: UseMutationOptions<MemoRead, Error, { projId: number; requestBody: MemoCreate }>) =>
  useMutation(ProjectService.addMemoProjectProjIdMemoPut, options);

const ProjectHooks = {
  // tags
  useGetAllTags,
  // project
  useGetAllProjects,
  useGetProject,
  // sdoc
  useUploadDocument,
  useGetProjectDocuments,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  // users
  useGetAllUsers,
  useAddUser,
  useRemoveUser,
  useGetAllCodes,
  // memo
  useGetMemo,
  useCreateMemo,
};

export default ProjectHooks;
