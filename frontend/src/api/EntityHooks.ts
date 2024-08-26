import { useMutation } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { EntityService } from "./openapi/services/EntityService.ts";

const useUpdateEntity = () =>
  useMutation({
    mutationFn: EntityService.updateById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ENTITY, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_ENTITIES, data.project_id] });
    },
  });

const useMerge = () =>
  useMutation({
    mutationFn: EntityService.mergeEntities,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ENTITY, data.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_ENTITIES, data.project_id] });
    },
  });

const useRelease = () =>
  useMutation({
    mutationFn: EntityService.releaseEntities,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ENTITY, data[0].project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.PROJECT_ENTITIES, data[0].project_id] });
    },
  });

const EntityHooks = {
  useUpdateEntity,
  useMerge,
  useRelease,
};

export default EntityHooks;
