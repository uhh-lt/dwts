import { MRT_Row, MRT_TableOptions } from "material-react-table";
import { useMemo } from "react";
import { useParams } from "react-router";
import TimelineAnalysisHooks from "../../../api/TimelineAnalysisHooks.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import AnalysisDashboard from "../AnalysisDashboard/AnalysisDashboard.tsx";
import {
  AnaylsisDashboardRow,
  HandleCreateAnalysis,
  useAnalysisDashboardTable,
} from "../AnalysisDashboard/useAnalysisDashboardTable.tsx";
import { TimelineAnalysisActions } from "./timelineAnalysisSlice.ts";

function TimelineAnalysisDashboard() {
  // global client state
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state
  const {
    data: userAnalysis,
    isLoading: isLoadingAnalysis,
    isFetching: isFetchingAnalysis,
    isError: isLoadingAnalysisError,
  } = TimelineAnalysisHooks.useGetUserTimelineAnalysisList();
  const userAnalysisTableData: AnaylsisDashboardRow[] = useMemo(
    () =>
      userAnalysis?.map((analysis) => ({
        id: analysis.id,
        title: analysis.name,
        updated: analysis.updated,
        user_id: analysis.user_id,
      })) || [],
    [userAnalysis],
  );

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // mutations
  const { mutate: createTimelineAnalysis, isPending: isCreatingTimelineAnalysis } =
    TimelineAnalysisHooks.useCreateTimelineAnalysis();
  const {
    mutate: deleteTimelineAnalysis,
    isPending: isDeletingTimelineAnalysis,
    variables: deletingVariables,
  } = TimelineAnalysisHooks.useDeleteTimelineAnalysis();
  const { mutate: updateTimelineAnalysis, isPending: isUpdatingTimelineAnalysis } =
    TimelineAnalysisHooks.useUpdateTimelineAnalysis();
  const {
    mutate: duplicateTimelineAnalysis,
    isPending: isDuplicatingTimelineAnalysis,
    variables: duplicatingVariables,
  } = TimelineAnalysisHooks.useDuplicateTimelineAnalysis();

  const dispatch = useAppDispatch();

  // CRUD actions
  const handleCreateAnalysis: HandleCreateAnalysis =
    () =>
    ({ values, table }) => {
      createTimelineAnalysis(
        {
          requestBody: {
            project_id: projectId,
            name: values.title,
          },
        },
        {
          onSuccess(data) {
            openSnackbar({
              text: `Created new timeline analysis '${data.name}'`,
              severity: "success",
            });
            table.setCreatingRow(null); //exit creating mode
          },
        },
      );
    };

  const handleDuplicateAnalysis = (row: MRT_Row<AnaylsisDashboardRow>) => {
    duplicateTimelineAnalysis(
      {
        timelineAnalysisId: row.original.id,
      },
      {
        onSuccess(data) {
          openSnackbar({
            text: `Duplicated analysis '${data.name}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleDeleteAnalysis = (row: MRT_Row<AnaylsisDashboardRow>) => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the analysis ${row.original.id}? This action cannot be undone!`,
      onAccept: () => {
        deleteTimelineAnalysis(
          {
            timelineAnalysisId: row.original.id,
          },
          {
            onSuccess(data) {
              openSnackbar({
                text: `Deleted analysis '${data.name}'`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  };

  const handleEditAnalysis: MRT_TableOptions<AnaylsisDashboardRow>["onEditingRowSave"] = ({ values, table, row }) => {
    updateTimelineAnalysis(
      {
        timelineAnalysisId: row.original.id,
        requestBody: {
          name: values.name,
        },
      },
      {
        onSuccess(data) {
          openSnackbar({
            text: `Updated analysis '${data.name}'`,
            severity: "success",
          });
          table.setEditingRow(null); //exit editing mode
        },
      },
    );
  };

  // table
  const table = useAnalysisDashboardTable({
    analysisName: "Timeline Analysis",
    data: userAnalysisTableData,
    isLoadingData: isLoadingAnalysis,
    isFetchingData: isFetchingAnalysis,
    isLoadingDataError: isLoadingAnalysisError,
    isCreatingAnalysis: isCreatingTimelineAnalysis,
    isUpdatingAnalysis: isUpdatingTimelineAnalysis,
    isDuplicatingAnalysis: isDuplicatingTimelineAnalysis,
    isDeletingAnalysis: isDeletingTimelineAnalysis,
    deletingAnalysisId: deletingVariables?.timelineAnalysisId,
    duplicatingAnalysisId: duplicatingVariables?.timelineAnalysisId,
    onOpenAnalysis: (analysisId) => dispatch(TimelineAnalysisActions.onOpenTimelineAnalysis({ analysisId, projectId })),
    handleCreateAnalysis,
    handleEditAnalysis,
    handleDeleteAnalysis,
    handleDuplicateAnalysis,
  });

  return (
    <AnalysisDashboard
      pageTitle="Timeline Analysis Dashboard"
      headerTitle="Timeline Analysis Dashboard"
      subheaderTitle="Manage your timeline analysis"
      table={table}
    />
  );
}

export default TimelineAnalysisDashboard;
