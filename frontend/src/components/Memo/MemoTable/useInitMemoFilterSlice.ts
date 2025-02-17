import { useQuery } from "@tanstack/react-query";
import { MemoService } from "../../../api/openapi/services/MemoService.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { AppDispatch } from "../../../store/store.ts";
import { tableInfoQueryKey } from "../../FilterDialog/filterSlice.ts";
import { ColumnInfo } from "../../FilterDialog/filterUtils.ts";
import { MemoFilterActions } from "./memoFilterSlice.ts";

const useGetMemoSearchInfo = (projectId: number, dispatch: AppDispatch) =>
  useQuery<ColumnInfo[]>({
    queryKey: tableInfoQueryKey("memoFilter", projectId),
    queryFn: async () => {
      const result = await MemoService.searchMemoInfo({ projectId });
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
      dispatch(MemoFilterActions.init({ columnInfoMap }));
      return columnInfo;
    },
    staleTime: Infinity,
  });

export const useInitMemoFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const { data: columnData } = useGetMemoSearchInfo(projectId, dispatch);

  return columnData;
};
