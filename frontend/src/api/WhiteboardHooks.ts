import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Edge, Node } from "reactflow";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { WhiteboardRead } from "./openapi/models/WhiteboardRead.ts";
import { WhiteboardService } from "./openapi/services/WhiteboardService.ts";

// WHITEBOARD QUERIES

export type WhiteboardGraph = {
  nodes: Node[];
  edges: Edge[];
};

export type WhiteboardMap = Record<number, Whiteboard>;
export type Whiteboard = Omit<WhiteboardRead, "content"> & { content: WhiteboardGraph };

interface UseProjectWhiteboardsQueryParams<T> {
  select?: (data: WhiteboardMap) => T;
  enabled?: boolean;
}

const useProjectWhiteboardsQuery = <T = WhiteboardMap>({ select, enabled }: UseProjectWhiteboardsQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.WHITEBOARDS_PROJECT, projectId],
    queryFn: async () => {
      const data = await WhiteboardService.getByProject({ projectId: projectId! });
      return data.reduce((acc, whiteboard) => {
        const content = JSON.parse(whiteboard.content) as WhiteboardGraph;
        acc[whiteboard.id] = { ...whiteboard, content };
        return acc;
      }, {} as WhiteboardMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
  });
};

const useGetWhiteboard = (whiteboardId: number | null | undefined) =>
  useProjectWhiteboardsQuery({
    select: (data) => data[whiteboardId!],
    enabled: !!whiteboardId,
  });

const useGetProjectWhiteboardsList = () => useProjectWhiteboardsQuery({ select: (data) => Object.values(data) });

// WHITEBOARD MUTATIONS
const useCreateWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.create,
    onSuccess(data) {
      const newWhiteboard = { ...data, content: { nodes: [], edges: [] } };
      queryClient.setQueryData<WhiteboardMap>([QueryKey.WHITEBOARDS_PROJECT, data.project_id], (prevWhiteboards) => {
        return prevWhiteboards ? { ...prevWhiteboards, [data.id]: newWhiteboard } : { [data.id]: newWhiteboard };
      });
    },
  });

const useUpdateWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.updateById,
    onSuccess(data) {
      const updatedWhiteboard = { ...data, content: JSON.parse(data.content) as WhiteboardGraph };
      queryClient.setQueryData<WhiteboardMap>([QueryKey.WHITEBOARDS_PROJECT, data.project_id], (prevWhiteboards) => {
        return prevWhiteboards
          ? { ...prevWhiteboards, [data.id]: updatedWhiteboard }
          : { [data.id]: updatedWhiteboard };
      });
    },
  });

const useDuplicateWhiteboard = () => {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  return useMutation({
    mutationFn: WhiteboardService.duplicateById,
    onSuccess(data) {
      const duplicatedWhiteboard = { ...data, content: JSON.parse(data.content) as WhiteboardGraph };
      queryClient.setQueryData<WhiteboardMap>([QueryKey.WHITEBOARDS_PROJECT, projectId], (prevWhiteboards) =>
        prevWhiteboards ? { ...prevWhiteboards, [data.id]: duplicatedWhiteboard } : { [data.id]: duplicatedWhiteboard },
      );
    },
  });
};

const useDeleteWhiteboard = () => {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  return useMutation({
    mutationFn: WhiteboardService.deleteById,
    onSuccess(data) {
      queryClient.setQueryData<WhiteboardMap>([QueryKey.WHITEBOARDS_PROJECT, projectId], (prevWhiteboards) => {
        if (!prevWhiteboards) return prevWhiteboards;
        const newData = { ...prevWhiteboards };
        delete newData[data.id];
        return newData;
      });
    },
  });
};

const WhiteboardHooks = {
  useGetProjectWhiteboardsList,
  useGetWhiteboard,
  useCreateWhiteboard,
  useDuplicateWhiteboard,
  useUpdateWhiteboard,
  useDeleteWhiteboard,
};

export default WhiteboardHooks;
