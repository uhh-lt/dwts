import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient";
import { QueryKey } from "./QueryKey";
import {
  ActionQueryParameters,
  ActionRead,
  CodeRead,
  DocumentTagRead,
  MemoRead,
  PaginatedSourceDocumentReads,
  ProjectCreate,
  ProjectRead,
  ProjectService,
  ProjectUpdate,
  SourceDocumentMetadataRead,
  UserRead,
} from "./openapi";
import { useSelectEnabledCodes } from "./utils";

//tags
const useGetAllTags = (projectId: number) =>
  useQuery<DocumentTagRead[], Error>(
    [QueryKey.PROJECT_TAGS, projectId],
    () =>
      ProjectService.getProjectTags({
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
const useGetAllProjects = () => useQuery<ProjectRead[], Error>([QueryKey.PROJECTS], () => ProjectService.readAll({}));

const useGetProject = (projectId: number | undefined) =>
  useQuery<ProjectRead, Error>(
    [QueryKey.PROJECT, projectId],
    () =>
      ProjectService.readProject({
        projId: projectId!,
      }),
    { enabled: !!projectId }
  );

// sdoc
const useUploadDocument = () =>
  useMutation(ProjectService.uploadProjectSdoc, {
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_SDOCS, variables.projId]);
      queryClient.invalidateQueries([QueryKey.PROJECT_SDOCS_INFINITE, variables.projId]);
    },
  });

const useGetProjectDocuments = (projectId: number) =>
  useQuery<PaginatedSourceDocumentReads, Error>([QueryKey.PROJECT_SDOCS, projectId], () =>
    ProjectService.getProjectSdocs({
      projId: projectId,
    })
  );

const useGetProjectDocumentsInfinite = (projectId: number, refetch: boolean) =>
  useInfiniteQuery(
    [QueryKey.PROJECT_SDOCS_INFINITE, projectId],
    async ({ pageParam = 0 }) =>
      await ProjectService.getProjectSdocs({
        projId: projectId,
        skip: pageParam,
        limit: 10,
      }),
    {
      getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_page_offset : undefined),
      refetchInterval: refetch ? 1000 : false,
    }
  );

const useResolveSdocIdByFilename = (projectId: number, filename: string) =>
    useQuery<number, Error>([QueryKey.SDOC_NAME_BY_PROJECT_AND_FILENAME, projectId, filename], () =>
        ProjectService.resolveFilename({
            projId: projectId,
            filename: filename,
        })
    );

const useCreateProject = () =>
  useMutation(
    async ({ userId, requestBody }: { userId: number; requestBody: ProjectCreate }) => {
      const project = await ProjectService.createNewProject({ requestBody });
      await ProjectService.associateUserToProject({
        projId: project.id,
        userId,
      });
      return project;
    },
    {
      onSuccess: (project, variables) => {
        queryClient.invalidateQueries([QueryKey.USER_PROJECTS, variables.userId]);
      },
    }
  );

const useUpdateProject = () =>
  useMutation(
    (variables: { userId: number; projId: number; requestBody: ProjectUpdate }) => {
      return ProjectService.updateProject({
        projId: variables.projId,
        requestBody: variables.requestBody,
      });
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries([QueryKey.USER_PROJECTS, variables.userId]);
        queryClient.invalidateQueries([QueryKey.PROJECT, data.id]);
      },
    }
  );

const useDeleteProject = () =>
  useMutation(
    (variables: { userId: number; projId: number }) => ProjectService.deleteProject({ projId: variables.projId }),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries([QueryKey.USER_PROJECTS, variables.userId]);
      },
    }
  );

// users
const useGetAllUsers = (projectId: number | undefined) =>
  useQuery<UserRead[], Error>(
    [QueryKey.PROJECT_USERS, projectId],
    () =>
      ProjectService.getProjectUsers({
        projId: projectId!,
      }),
    {
      enabled: !!projectId,
    }
  );
const useAddUser = () =>
  useMutation(ProjectService.associateUserToProject, {
    onSuccess: (user, variables) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_USERS, variables.projId]);
      queryClient.invalidateQueries([QueryKey.USER_PROJECTS, user.id]);
    },
  });

const useRemoveUser = () =>
  useMutation(ProjectService.dissociateUserFromProject, {
    onSuccess: (user, variables) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_USERS, variables.projId]);
      queryClient.invalidateQueries([QueryKey.USER_PROJECTS, user.id]);
    },
  });

// codes
const useGetAllCodes = (projectId: number, returnAll: boolean = false) => {
  const selectEnabledCodes = useSelectEnabledCodes();
  return useQuery<CodeRead[], Error>(
    [QueryKey.PROJECT_CODES, projectId],
    () =>
      ProjectService.getProjectCodes({
        projId: projectId,
      }),
    {
      select: returnAll ? undefined : selectEnabledCodes,
    }
  );
};

// memo
const useGetMemo = (projectId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.MEMO_PROJECT, projectId, userId],
    () =>
      ProjectService.getUserMemos({
        projId: projectId!,
        userId: userId!,
      }).then((memos) => memos[0]),
    {
      retry: false,
      enabled: !!projectId && !!userId,
    }
  );

const useGetAllUserMemos = (projectId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.USER_MEMOS, projectId, userId],
    () =>
      ProjectService.getUserMemosOfProject({
        projId: projectId!,
        userId: userId!,
      }),
    {
      retry: false,
      enabled: !!projectId && !!userId,
    }
  );

const useCreateMemo = () =>
  useMutation(ProjectService.addMemo, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO_PROJECT, data.project_id, data.user_id]);
    },
  });

// actions
const useGetActions = (projectId: number, userId: number) =>
  useQuery<Array<ActionRead>, Error>(
    [QueryKey.ACTION, projectId, userId],
    () =>
      ProjectService.getUserActionsOfProject({
        projId: projectId,
        userId: userId,
      }),
    {
      refetchOnWindowFocus: false,
    }
  );

const useQueryActions = (requestBody: ActionQueryParameters) =>
  useQuery<ActionRead[], Error>([QueryKey.ACTIONS_QUERY, requestBody], () =>
    ProjectService.queryActionsOfProject({
      requestBody: requestBody,
    })
  );

// metadata
const useGetMetadataByKey = (projectId: number, metadataKey: string) =>
  useQuery<SourceDocumentMetadataRead[], Error>(
    [QueryKey.PROJECT_METADATA_BY_METADATA_KEY, projectId, metadataKey],
    () =>
      ProjectService.getProjectMetadataByMetadataKey({
        projId: projectId,
        metadataKey: metadataKey,
      })
  );

const ProjectHooks = {
  // tags
  useGetAllTags,
  // project
  useGetAllProjects,
  useGetProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  // sdoc
  useUploadDocument,
  useGetProjectDocuments,
  useGetProjectDocumentsInfinite,
  useResolveSdocIdByFilename,
  // users
  useGetAllUsers,
  useAddUser,
  useRemoveUser,
  // codes
  useGetAllCodes,
  // memo
  useGetMemo,
  useGetAllUserMemos,
  useCreateMemo,
  // actions
  useGetActions,
  useQueryActions,
  // metadata
  useGetMetadataByKey,
};

export default ProjectHooks;
