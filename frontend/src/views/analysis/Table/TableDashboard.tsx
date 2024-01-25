import CancelIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
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
import { useCallback, useContext, useState } from "react";
import { useParams } from "react-router";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import TableHooks, { TableRead } from "../../../api/TableHooks";
import { TableType } from "../../../api/openapi";
import { useAuth } from "../../../auth/AuthProvider";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { AppBarContext } from "../../../layouts/TwoBarLayout";
import CreateEntityCard from "../../../features/AnalysisDashboard/CreateTableCard";
import { TableType2Template } from "./templates";
import { dateToLocaleString } from "../../../utils/DateUtils";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI";

function TableDashboard() {
  const appBarContainerRef = useContext(AppBarContext);
  const navigate = useNavigate();

  // global client state
  const { user } = useAuth();
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state
  const userTables = TableHooks.useGetUserTables(projectId, user?.id);

  // local client state
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  // mutations
  const createTable = TableHooks.useCreateTable();
  const deleteTable = TableHooks.useDeleteTable();
  const updateTable = TableHooks.useUpdateTable();

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID" },
    {
      field: "title",
      headerName: "Name",
      flex: 1,
      editable: true,
    },
    {
      field: "updated",
      headerName: "Last modified",
      flex: 0.5,
      valueGetter: (params) => dateToLocaleString(params.value as string),
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
          <GridActionsCellItem
            icon={<ContentCopyIcon />}
            label="Duplicate"
            onClick={handleDuplicateTable(id as number)}
            color="inherit"
          />,
          <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={handleDeleteClick(id)} color="inherit" />,
        ];
      },
    },
  ];

  // CRUD actions
  const handleCreateTable = (tableType: TableType, title: string) => {
    if (!user?.id) return;

    const content = [{ id: uuidv4(), name: `Table sheet 1`, content: TableType2Template[tableType] }];
    createTable.mutate(
      {
        requestBody: {
          project_id: projectId,
          user_id: user.id,
          title,
          content: JSON.stringify(content),
          table_type: tableType,
        },
      },
      {
        onSuccess(_data, _variables, _context) {
          SnackbarAPI.openSnackbar({
            text: `Created new table '${title}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleDuplicateTable = useCallback(
    (id: number) => () => {
      if (!user?.id || !userTables.data) return;

      const table = userTables.data.find((table) => table.id === id);
      if (!table) return;

      const mutation = createTable.mutate;
      mutation(
        {
          requestBody: {
            project_id: projectId,
            user_id: user.id,
            title: table.title + " (copy)",
            content: JSON.stringify(table.content),
            table_type: table.table_type,
          },
        },
        {
          onSuccess(_data, _variables, _context) {
            SnackbarAPI.openSnackbar({
              text: `Duplicated table '${table.title}'`,
              severity: "success",
            });
          },
        },
      );
    },
    [createTable.mutate, projectId, user, userTables.data],
  );

  const handleDeleteClick = (id: GridRowId) => () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the table ${id}? This action cannot be undone!`,
      onAccept: () => {
        deleteTable.mutate(
          {
            analysisTableId: id as number,
          },
          {
            onSuccess(data, variables, context) {
              SnackbarAPI.openSnackbar({
                text: `Deleted table '${data.title}'`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  };

  const processRowUpdate = (newRow: GridRowModel<TableRead>) => {
    updateTable.mutate(
      {
        analysisTableId: newRow.id,
        requestBody: {
          title: newRow.title,
          content: JSON.stringify(newRow.content),
          table_type: newRow.table_type,
        },
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Updated table '${data.title}'`,
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
          Table Dashboard
        </Typography>
      </Portal>
      <Container maxWidth="xl" className="h100" style={{ display: "flex", flexDirection: "column" }} sx={{ py: 2 }}>
        <Card
          sx={{ width: "100%", height: "50%", maxHeight: "400px", mb: 2 }}
          elevation={2}
          className="myFlexFillAllContainer myFlexContainer"
        >
          <CardHeader title="Create table" />
          <CardContent className="myFlexFillAllContainer">
            <Box height="100%" overflow="auto" whiteSpace="nowrap">
              <CreateEntityCard
                title="Empty table"
                description="Create an empty table with no template"
                onClick={() => handleCreateTable(TableType.CUSTOM, "New table")}
              />
              <CreateEntityCard
                title="Interpretation table"
                description="Create a table with the interpretation template"
                onClick={() => handleCreateTable(TableType.INTERPRETATION, "New interpretation table")}
              />
              <CreateEntityCard
                title="Phenomenon table"
                description="Create a table with the phenomenon template"
                onClick={() => handleCreateTable(TableType.PHENOMENON, "New phenomenon table")}
              />
              <CreateEntityCard
                title="Situation table"
                description="Create a table with the situation template"
                onClick={() => handleCreateTable(TableType.SITUATION, "New situation table")}
              />
            </Box>
          </CardContent>
        </Card>
        <Card
          sx={{ width: "100%", minHeight: "225.5px" }}
          elevation={2}
          className="myFlexFillAllContainer myFlexContainer"
        >
          <CardHeader title="Load table" />
          <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
            <div className="h100" style={{ width: "100%" }}>
              <DataGrid
                rows={userTables.data || []}
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

export default TableDashboard;
