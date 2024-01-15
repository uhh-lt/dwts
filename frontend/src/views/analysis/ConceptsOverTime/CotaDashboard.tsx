import CancelIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { Box, Card, CardContent, CardHeader, Container, Portal, Typography } from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridEventListener,
  GridRowEditStopReasons,
  GridRowId,
  GridRowModel,
  GridRowModes,
  GridRowModesModel,
} from "@mui/x-data-grid";
import { useContext, useState } from "react";
import { useParams } from "react-router";
import { useNavigate } from "react-router-dom";
import CotaHooks from "../../../api/CotaHooks";
import { COTARead } from "../../../api/openapi";
import { useAuth } from "../../../auth/AuthProvider";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { AppBarContext } from "../../../layouts/TwoBarLayout";
import CreateCotaCard from "./CreateCotaCard";

function CotaDashboard() {
  const appBarContainerRef = useContext(AppBarContext);
  const navigate = useNavigate();

  // global client state
  const { user } = useAuth();
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state
  const userCotas = CotaHooks.useGetUserCotas(projectId, user?.id);

  // local client state
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  // mutations
  const createCota = CotaHooks.useCreateCota();
  const deleteCota = CotaHooks.useDeleteCota();
  const updateCota = CotaHooks.useUpdateCota();

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID" },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      editable: true,
    },
    {
      field: "updated",
      headerName: "Last modified",
      flex: 0.5,
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 110,
      cellClassName: "actions",
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

        if (isInEditMode) {
          return [
            <GridActionsCellItem
              icon={<SaveIcon />}
              label="Save"
              sx={{
                color: "primary.main",
              }}
              onClick={handleSaveClick(id)}
            />,
            <GridActionsCellItem
              icon={<CancelIcon />}
              label="Cancel"
              className="textPrimary"
              onClick={handleCancelClick(id)}
              color="inherit"
            />,
          ];
        }

        return [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            className="textPrimary"
            onClick={handleEditClick(id)}
            color="inherit"
          />,
          <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={handleDeleteClick(id)} color="inherit" />,
        ];
      },
    },
  ];

  // CRUD table actions
  const handleCreateCota = () => {
    if (!user?.id) return;

    createCota.mutate(
      {
        requestBody: {
          project_id: projectId,
          user_id: user.id,
          name: "New Concept Over Time Analysis",
        },
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Create new cota '${data.name}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleDeleteClick = (id: GridRowId) => () => {
    deleteCota.mutate(
      {
        cotaId: id as number,
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Deleted cota '${data.name}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const processRowUpdate = (newRow: GridRowModel<COTARead>) => {
    updateCota.mutate(
      {
        cotaId: newRow.id,
        requestBody: {
          name: newRow.name,
        },
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Updated CotA '${data?.name}'`,
            severity: "success",
          });
        },
      },
    );
    return newRow;
  };

  // UI actions
  const handleRowClick: GridEventListener<"rowClick"> = (params, event) => {
    if (params.id in rowModesModel && rowModesModel[params.id].mode === GridRowModes.Edit) return;
    navigate(`./${params.id}`);
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });
  };

  const handleRowEditStop: GridEventListener<"rowEditStop"> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Concept over time analysis Dashboard
        </Typography>
      </Portal>
      <Container maxWidth="xl" className="h100" style={{ display: "flex", flexDirection: "column" }} sx={{ py: 2 }}>
        <Card
          sx={{ width: "100%", height: "50%", maxHeight: "400px", mb: 2 }}
          elevation={2}
          className="myFlexFillAllContainer myFlexContainer"
        >
          <CardHeader title="Create Concept Over Time Analysis" />
          <CardContent className="myFlexFillAllContainer">
            <Box height="100%" overflow="auto" whiteSpace="nowrap">
              <CreateCotaCard
                title="Empty concept over time analysis"
                description="Create an empty analysis with no template"
                onClick={() => handleCreateCota()}
              />
            </Box>
          </CardContent>
        </Card>
        <Card
          sx={{ width: "100%", minHeight: "225.5px" }}
          elevation={2}
          className="myFlexFillAllContainer myFlexContainer"
        >
          <CardHeader title="Load Concept Over Time Analysis" />
          <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
            <div className="h100" style={{ width: "100%" }}>
              <DataGrid
                rows={userCotas.data || []}
                columns={columns}
                autoPageSize
                getRowId={(row) => row.id}
                onRowClick={handleRowClick}
                hideFooterSelectedRowCount
                style={{ border: "none" }}
                initialState={{
                  sorting: {
                    sortModel: [{ field: "updated", sort: "desc" }],
                  },
                }}
                editMode="row"
                rowModesModel={rowModesModel}
                onRowModesModelChange={(newRowModesModel) => setRowModesModel(newRowModesModel)}
                onRowEditStop={handleRowEditStop}
                processRowUpdate={processRowUpdate}
              />
            </div>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default CotaDashboard;
