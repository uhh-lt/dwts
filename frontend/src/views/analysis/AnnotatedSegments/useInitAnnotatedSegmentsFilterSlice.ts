import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AnalysisService } from "../../../api/openapi";
import { useAppDispatch } from "../../../plugins/ReduxHooks";
import { AnnotatedSegmentsFilterActions } from "./annotatedSegmentsFilterSlice";

const useGetAnnotatedSegmentsTableInfo = (projectId: number) =>
  useQuery(["tableInfo", "annotatedSegments", projectId], () => AnalysisService.annotatedSegmentsInfo({ projectId }));

export const useInitAnnotatedSegmentsFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const tableInfo = useGetAnnotatedSegmentsTableInfo(projectId);

  // effects
  useEffect(() => {
    if (!tableInfo.data) return;
    dispatch(
      AnnotatedSegmentsFilterActions.init({
        columnInfo: tableInfo.data.map((d) => {
          return { ...d, column: d.column.toString() };
        }),
      }),
    );
    console.log("initialized annotated segments filterSlice!");
  }, [dispatch, tableInfo.data]);

  return tableInfo;
};
