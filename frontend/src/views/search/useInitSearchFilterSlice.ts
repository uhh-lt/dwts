import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { SearchService } from "../../api/openapi/services/SearchService.ts";
import { ColumnInfo, ColumnInfoResponse } from "../../features/FilterDialog/filterUtils.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { SearchFilterActions } from "./searchFilterSlice.ts";

const useGetSearchInfo = (projectId: number) =>
  useQuery<ColumnInfoResponse>({
    queryKey: ["tableInfo", "search", projectId],
    queryFn: async () => {
      const result = await SearchService.searchSdocsInfo({ projectId });
      const columnInfo = result.map((info) => {
        return {
          ...info,
          column: info.column.toString(),
        };
      });
      const columnInfoMap: Record<string, ColumnInfo> = columnInfo.reduce((acc, info) => {
        return {
          ...acc,
          [info.column]: info,
        };
      }, {});
      return {
        info: columnInfo,
        map: columnInfoMap,
      };
    },
    staleTime: Infinity,
  });

export const useInitSearchFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetSearchInfo(projectId);

  // effects
  useEffect(() => {
    if (!columnData) return;
    dispatch(SearchFilterActions.init({ columnInfoMap: columnData.map }));
    console.log("initialized search filterSlice!");
  }, [dispatch, columnData]);

  return columnData?.info;
};
