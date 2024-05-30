import { MRT_Row, MRT_TableOptions } from "material-react-table";
import { useParams } from "react-router";
import WhiteboardHooks from "../../api/WhiteboardHooks.ts";
import { useAuth } from "../../auth/useAuth.ts";
import ConfirmationAPI from "../../features/ConfirmationDialog/ConfirmationAPI.ts";
import SnackbarAPI from "../../features/SnackbarDialog/SnackbarAPI.ts";
import AnalysisDashboard from "../analysis/AnalysisDashboard/AnalysisDashboard.tsx";
import {
  AnaylsisDashboardRow,
  HandleCreateAnalysis,
  useAnalysisDashboardTable,
} from "../analysis/AnalysisDashboard/useAnalysisDashboardTable.tsx";

function WhiteboardDashboard() {
  // global client state
  const { user } = useAuth();
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state
  const {
    data: projectWhiteboards,
    isLoading: isLoadingWhiteboards,
    isFetching: isFetchingWhiteboards,
    isError: isLoadingWhiteboardsError,
  } = WhiteboardHooks.useGetProjectWhiteboards(projectId);

  // mutations
  const { mutate: createWhiteboard, isPending: isCreatingWhiteboard } = WhiteboardHooks.useCreateWhiteboard();
  const {
    mutate: deleteWhiteboard,
    isPending: isDeletingWhiteboard,
    variables: deletingVariables,
  } = WhiteboardHooks.useDeleteWhiteboard();
  const { mutate: updateWhiteboard, isPending: isUpdatingWhiteboard } = WhiteboardHooks.useUpdateWhiteboard();
  const {
    mutate: duplicateWhiteboard,
    isPending: isDuplicatingWhiteboard,
    variables: duplicatingVariables,
  } = WhiteboardHooks.useDuplicateWhiteboard();

  // CRUD actions
  const handleDuplicateClick = (row: MRT_Row<AnaylsisDashboardRow>) => {
    duplicateWhiteboard(
      {
        whiteboardId: row.original.id,
      },
      {
        onSuccess(data) {
          SnackbarAPI.openSnackbar({
            text: `Duplicated whiteboard '${data.title}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleDeleteClick = (row: MRT_Row<AnaylsisDashboardRow>) => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the whiteboard ${row.original.id}? This action cannot be undone!`,
      onAccept: () => {
        deleteWhiteboard(
          {
            whiteboardId: row.original.id,
          },
          {
            onSuccess(data) {
              SnackbarAPI.openSnackbar({
                text: `Deleted whiteboard '${data.title}'`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  };

  const handleCreateWhiteboard: HandleCreateAnalysis =
    () =>
    ({ values, table }) => {
      if (!user?.id) return;
      createWhiteboard(
        {
          requestBody: {
            project_id: projectId,
            user_id: user.id,
            title: values.title,
          },
        },
        {
          onSuccess(data) {
            SnackbarAPI.openSnackbar({
              text: `Created new whiteboard '${data.title}'`,
              severity: "success",
            });
            table.setCreatingRow(null); //exit creating mode
          },
        },
      );
    };
  const handleUpdateWhiteboard: MRT_TableOptions<AnaylsisDashboardRow>["onEditingRowSave"] = ({
    row,
    values,
    table,
  }) => {
    if (!values.title || values.title === row.original.title) {
      table.setEditingRow(null); //exit editing mode
      return; // not provided OR no change
    }
    updateWhiteboard(
      {
        whiteboardId: row.original.id,
        requestBody: {
          title: values.title,
        },
      },
      {
        onSuccess(data) {
          SnackbarAPI.openSnackbar({
            text: `Updated whiteboard '${data.title}'`,
            severity: "success",
          });
          table.setEditingRow(null); //exit editing mode
        },
      },
    );
  };

  // table
  const table = useAnalysisDashboardTable({
    analysisName: "Whiteboard",
    data: projectWhiteboards || [],
    isLoadingData: isLoadingWhiteboards,
    isFetchingData: isFetchingWhiteboards,
    isLoadingDataError: isLoadingWhiteboardsError,
    isCreatingAnalysis: isCreatingWhiteboard,
    isDeletingAnalysis: isDeletingWhiteboard,
    isDuplicatingAnalysis: isDuplicatingWhiteboard,
    isUpdatingAnalysis: isUpdatingWhiteboard,
    deletingAnalysisId: deletingVariables?.whiteboardId,
    duplicatingAnalysisId: duplicatingVariables?.whiteboardId,
    handleCreateAnalysis: handleCreateWhiteboard,
    handleEditAnalysis: handleUpdateWhiteboard,
    handleDeleteAnalysis: handleDeleteClick,
    handleDuplicateAnalysis: handleDuplicateClick,
  });

  return (
    <AnalysisDashboard
      pageTitle="Whiteboard Dashboard"
      headerTitle="Whiteboard Dashboard"
      subheaderTitle="Manage your whiteboards"
      table={table}
    />
  );
}

export default WhiteboardDashboard;
