import { MRT_Row, MRT_TableOptions } from "material-react-table";
import { useMemo } from "react";
import { useParams } from "react-router";
import CotaHooks from "../../../api/CotaHooks.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import AnalysisDashboard from "../AnalysisDashboard/AnalysisDashboard.tsx";
import {
  AnaylsisDashboardRow,
  HandleCreateAnalysis,
  useAnalysisDashboardTable,
} from "../AnalysisDashboard/useAnalysisDashboardTable.tsx";

function CotaDashboard() {
  // global client state
  const { user } = useAuth();
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state
  const {
    data: userAnalysis,
    isLoading: isLoadingAnalysis,
    isFetching: isFetchingAnalysis,
    isError: isLoadingAnalysisError,
  } = CotaHooks.useGetUserCotas(projectId, user?.id);
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

  // mutations
  const { mutate: createCota, isPending: isCreatingCota } = CotaHooks.useCreateCota();
  const { mutate: deleteCota, isPending: isDeletingCota, variables: deletingVariables } = CotaHooks.useDeleteCota();
  const { mutate: updateCota, isPending: isUpdatingCota } = CotaHooks.useUpdateCota();
  const {
    mutate: duplicateCota,
    isPending: isDuplicatingCota,
    variables: duplicatingVariables,
  } = CotaHooks.useDuplicateCota();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // CRUD actions
  const handleCreateAnalysis: HandleCreateAnalysis =
    () =>
    ({ values, table }) => {
      if (!user?.id) return;
      createCota(
        {
          requestBody: {
            project_id: projectId,
            user_id: user.id,
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
    duplicateCota(
      {
        cotaId: row.original.id,
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
        deleteCota(
          {
            cotaId: row.original.id,
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

  const handleEditAnalysis: MRT_TableOptions<AnaylsisDashboardRow>["onEditingRowSave"] = ({ values, table }) => {
    updateCota(
      {
        cotaId: values.id,
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
    analysisName: "COTA",
    data: userAnalysisTableData,
    isLoadingData: isLoadingAnalysis,
    isFetchingData: isFetchingAnalysis,
    isLoadingDataError: isLoadingAnalysisError,
    isCreatingAnalysis: isCreatingCota,
    isUpdatingAnalysis: isUpdatingCota,
    isDuplicatingAnalysis: isDuplicatingCota,
    isDeletingAnalysis: isDeletingCota,
    deletingAnalysisId: deletingVariables?.cotaId,
    duplicatingAnalysisId: duplicatingVariables?.cotaId,
    handleCreateAnalysis,
    handleEditAnalysis,
    handleDeleteAnalysis,
    handleDuplicateAnalysis,
  });

  return (
    <AnalysisDashboard
      pageTitle="Concept Over Time Analysis Dashboard"
      headerTitle="Concept Over Time Dashboard"
      subheaderTitle="Manage your Concept Over Time Analysis"
      table={table}
    />
  );
}

export default CotaDashboard;
