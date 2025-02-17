import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { ProjectMetadataRead } from "./openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataRead } from "./openapi/models/SourceDocumentMetadataRead.ts";
import { ProjectMetadataService } from "./openapi/services/ProjectMetadataService.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";
import { SdocMetadataService } from "./openapi/services/SdocMetadataService.ts";
import { SourceDocumentService } from "./openapi/services/SourceDocumentService.ts";

// PROJECT METADATA QUERIES

export type ProjectMetadataMap = Record<number, ProjectMetadataRead>;

interface UseProjectMetaadataQueryParams<T> {
  select?: (data: ProjectMetadataMap) => T;
  enabled?: boolean;
}

const useProjectMetadataQuery = <T = ProjectMetadataMap>({ select, enabled }: UseProjectMetaadataQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_METADATAS, projectId],
    queryFn: async () => {
      const metadata = await ProjectService.getAllMetadata({
        projId: projectId!,
      });
      return metadata.reduce((acc, metadata) => {
        acc[metadata.id] = metadata;
        return acc;
      }, {} as ProjectMetadataMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
  });
};

const useGetProjectMetadata = (metadataId: number | null | undefined) =>
  useProjectMetadataQuery({
    select: (data) => data[metadataId!],
    enabled: !!metadataId,
  });

const useGetProjectMetadataList = () => useProjectMetadataQuery({ select: (data) => Object.values(data) });

// PROJECT METADATA MUTATIONS
const useCreateProjectMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.createNewMetadata,
    onSuccess: (data) => {
      queryClient.setQueryData<ProjectMetadataMap>([QueryKey.PROJECT_METADATAS, data.project_id], (old) =>
        old ? { ...old, [data.id]: data } : { [data.id]: data },
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS] }); // sdoc metadata queries need to be refetched, as there is new metadata now!
      queryClient.invalidateQueries({ queryKey: [QueryKey.TABLE_INFO] }); // tableInfo queries need to be refetched, as there is new metadata now!
    },
    meta: {
      successMessage: (data: ProjectMetadataRead) => `Added metadata to Project ${data.project_id}`,
      errorMessage: (error: { status: number }) =>
        error.status === 409 ? "Key already exists" : "Could not add metadata",
    },
  });

const useUpdateProjectMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.updateById,
    onSuccess: (metadata) => {
      queryClient.setQueryData<ProjectMetadataMap>([QueryKey.PROJECT_METADATAS, metadata.project_id], (old) =>
        old ? { ...old, [metadata.id]: metadata } : { [metadata.id]: metadata },
      );
    },
    meta: {
      successMessage: (projectMetadata: ProjectMetadataRead) =>
        `Updated projectMetadata ${projectMetadata.id} for project ${projectMetadata.project_id}`,
    },
  });

const useDeleteProjectMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.deleteById,
    onSuccess: (data) => {
      queryClient.setQueryData<ProjectMetadataMap>([QueryKey.PROJECT_METADATAS, data.project_id], (old) => {
        const newData = { ...old };
        delete newData[data.id];
        return newData;
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS] }); // sdoc metadata queries need to be refetched, as metadata was deleted
      queryClient.invalidateQueries({ queryKey: [QueryKey.TABLE_INFO] }); // tableInfo queries need to be refetched, as metadata was deleted
    },
  });

// SDOC METADATA QUERIES

export type SdocMetadataMap = Record<number, SourceDocumentMetadataRead>;

interface UseSdocMetadataQueryParams<T> {
  sdocId: number | undefined | null;
  select?: (data: SdocMetadataMap) => T;
}

const useSdocMetadataQuery = <T = SdocMetadataMap>({ sdocId, select }: UseSdocMetadataQueryParams<T>) =>
  useQuery({
    queryKey: [QueryKey.SDOC_METADATAS, sdocId],
    queryFn: async () => {
      const metadata = await SourceDocumentService.getAllMetadata({
        sdocId: sdocId!,
      });
      return metadata.reduce((acc, metadata) => {
        acc[metadata.id] = metadata;
        return acc;
      }, {} as SdocMetadataMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!sdocId,
  });

const useGetSdocMetadata = (sdocId: number | null | undefined) =>
  useSdocMetadataQuery({
    sdocId,
    select: (data) => Object.values(data),
  });

const useGetSdocMetadataByProjectMetadataId = (sdocId: number | null | undefined, projectMetadataId: number) =>
  useSdocMetadataQuery({
    sdocId,
    select: (data) => Object.values(data).find((metadata) => metadata.project_metadata_id === projectMetadataId),
  });

// TODO: REMOVE THIS HOOK
const useGetSdocMetadataByKey = (sdocId: number | null | undefined, key: string) =>
  useQuery<SourceDocumentMetadataRead, Error>({
    queryKey: [QueryKey.SDOC_METADATA_BY_KEY, sdocId, key],
    queryFn: () =>
      SourceDocumentService.readMetadataByKey({
        sdocId: sdocId!,
        metadataKey: key,
      }),
    enabled: !!sdocId,
  });

// SDOC METADATA MUTATIONS

const useUpdateSdocMetadata = () =>
  useMutation({
    mutationFn: SdocMetadataService.updateById,
    onSuccess: (metadata) => {
      queryClient.setQueryData<SdocMetadataMap>([QueryKey.SDOC_METADATAS, metadata.source_document_id], (old) =>
        old ? { ...old, [metadata.id]: metadata } : { [metadata.id]: metadata },
      );
    },
  });

const useUpdateBulkSdocMetadata = () =>
  useMutation({
    mutationFn: SdocMetadataService.updateBulk,
    onSuccess: (metadatas) => {
      metadatas.forEach((metadata) => {
        queryClient.setQueryData<SdocMetadataMap>([QueryKey.SDOC_METADATAS, metadata.source_document_id], (old) =>
          old ? { ...old, [metadata.id]: metadata } : { [metadata.id]: metadata },
        );
      });
    },
  });

const MetadataHooks = {
  // sdoc metadata
  useGetSdocMetadata,
  useGetSdocMetadataByKey,
  useGetSdocMetadataByProjectMetadataId,
  useUpdateSdocMetadata,
  useUpdateBulkSdocMetadata,
  // project metadata
  useGetProjectMetadataList,
  useGetProjectMetadata,
  useCreateProjectMetadata,
  useUpdateProjectMetadata,
  useDeleteProjectMetadata,
};

export default MetadataHooks;
