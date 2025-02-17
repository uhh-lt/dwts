import LabelIcon from "@mui/icons-material/Label";
import { LoadingButton } from "@mui/lab";
import { Box, Button, DialogActions, Stack, Typography } from "@mui/material";
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_RowModel,
  MRT_RowSelectionState,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo, useState } from "react";
import MetadataHooks from "../../../../api/MetadataHooks.ts";
import { MetadataExtractionResult } from "../../../../api/openapi/models/MetadataExtractionResult.ts";
import { ProjectMetadataRead } from "../../../../api/openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataBulkUpdate } from "../../../../api/openapi/models/SourceDocumentMetadataBulkUpdate.ts";
import { SourceDocumentMetadataReadResolved } from "../../../../api/openapi/models/SourceDocumentMetadataReadResolved.ts";
import { useAppDispatch } from "../../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import { SdocMetadataRendererWithData } from "../../../Metadata/SdocMetadataRenderer.tsx";
import SdocRenderer from "../../../SourceDocument/SdocRenderer.tsx";

interface MetadataExtractionResultRow {
  sdocId: number;
  metadataDict: Record<
    number,
    {
      currentValue: SourceDocumentMetadataReadResolved;
      suggestedValue?: SourceDocumentMetadataReadResolved;
      useSuggested: boolean;
    }
  >;
}

function MetadataExtractionResultStepTable({ data }: { data: MetadataExtractionResult[] }) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const buttonsDisabled = Object.keys(rowSelectionModel).length === 0;

  // map the data to project metadata result rows
  const { rows2, projectMetadataDict } = useMemo(() => {
    const projectMetadataDict: Record<number, ProjectMetadataRead> = {};
    const rows: MetadataExtractionResultRow[] = [];
    for (const result of data) {
      const currentMetadataDict: Record<number, SourceDocumentMetadataReadResolved> = result.current_metadata.reduce(
        (acc, metadata) => {
          acc[metadata.project_metadata.id] = metadata;
          return acc;
        },
        {} as Record<number, SourceDocumentMetadataReadResolved>,
      );
      const suggestedMetadataDict: Record<number, SourceDocumentMetadataReadResolved> =
        result.suggested_metadata.reduce(
          (acc, metadata) => {
            acc[metadata.project_metadata.id] = metadata;
            return acc;
          },
          {} as Record<number, SourceDocumentMetadataReadResolved>,
        );

      const row: MetadataExtractionResultRow = {
        sdocId: result.sdoc_id,
        metadataDict: {},
      };
      for (const projectMetadataId of Object.keys(currentMetadataDict)) {
        const pmId = parseInt(projectMetadataId);
        row.metadataDict[pmId] = {
          currentValue: currentMetadataDict[pmId],
          suggestedValue: suggestedMetadataDict[pmId],
          useSuggested: true,
        };
        projectMetadataDict[pmId] = currentMetadataDict[pmId].project_metadata;
      }
      rows.push(row);
    }
    return { rows2: rows, projectMetadataDict: projectMetadataDict };
  }, [data]);

  // init the rows
  const [theRows, setTheRows] = useState<MetadataExtractionResultRow[]>(rows2);

  // actions
  const handleSelectCell = (sdocId: number, projectMetadataId: number) => () => {
    setTheRows((rows) => {
      // flip the useSuggested flag
      return rows.map((row) => {
        if (row.sdocId === sdocId) {
          return {
            ...row,
            metadataDict: {
              ...row.metadataDict,
              [projectMetadataId]: {
                ...row.metadataDict[projectMetadataId],
                useSuggested: !row.metadataDict[projectMetadataId].useSuggested,
              },
            },
          };
        }
        return row;
      });
    });
  };

  const applyCurrentMetadata = (selectedRows: MRT_RowModel<MetadataExtractionResultRow>) => () => {
    // for all the selectedRows, set the useSuggested flag to false
    setTheRows((rows) => {
      return rows.map((row) => {
        if (selectedRows.rowsById[`${row.sdocId}`]) {
          return {
            ...row,
            metadataDict: Object.keys(row.metadataDict).reduce(
              (acc, key) => {
                const pmId = parseInt(key);
                acc[pmId] = {
                  ...row.metadataDict[pmId],
                  useSuggested: false,
                };
                return acc;
              },
              {} as MetadataExtractionResultRow["metadataDict"],
            ),
          };
        }
        return row;
      });
    });
  };

  const applySuggestedMetadata = (selectedRows: MRT_RowModel<MetadataExtractionResultRow>) => () => {
    // for all the selectedRows, set the useSuggested flag to false
    setTheRows((rows) => {
      return rows.map((row) => {
        if (selectedRows.rowsById[`${row.sdocId}`]) {
          return {
            ...row,
            metadataDict: Object.keys(row.metadataDict).reduce(
              (acc, key) => {
                const pmId = parseInt(key);
                acc[pmId] = {
                  ...row.metadataDict[pmId],
                  useSuggested: true,
                };
                return acc;
              },
              {} as MetadataExtractionResultRow["metadataDict"],
            ),
          };
        }
        return row;
      });
    });
  };

  // dialog actions
  const dispatch = useAppDispatch();
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeLLMDialog());
  };

  const updateBulkMetadataMutation = MetadataHooks.useUpdateBulkSdocMetadata();
  const handleUpdateBulkMetadata = () => {
    // find all the metadata where the useSuggested flag is true
    const metadataToUpdate: SourceDocumentMetadataBulkUpdate[] = theRows.reduce((acc, row) => {
      for (const metadata of Object.values(row.metadataDict)) {
        if (metadata.useSuggested && metadata.suggestedValue) {
          acc.push({
            id: metadata.suggestedValue.id,
            boolean_value: metadata.suggestedValue.boolean_value,
            date_value: metadata.suggestedValue.date_value,
            int_value: metadata.suggestedValue.int_value,
            list_value: metadata.suggestedValue.list_value,
            str_value: metadata.suggestedValue.str_value,
          });
        }
      }
      return acc;
    }, [] as SourceDocumentMetadataBulkUpdate[]);

    // update the metadata
    updateBulkMetadataMutation.mutate(
      {
        requestBody: metadataToUpdate,
      },
      {
        onSuccess() {
          dispatch(CRUDDialogActions.closeLLMDialog());
        },
      },
    );
  };

  // columns
  const columns = useMemo(() => {
    const result: MRT_ColumnDef<MetadataExtractionResultRow>[] = [
      {
        id: "Filename",
        header: "Document",
        Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} renderFilename />,
      },
    ];

    for (const projectMetadata of Object.values(projectMetadataDict)) {
      result.push({
        id: `${projectMetadata.id.toString()}-current`,
        header: `${projectMetadata.key} (current)`,
        muiTableBodyCellProps: ({ row }) => {
          const isSelected = !row.original.metadataDict[projectMetadata.id].useSuggested;
          return {
            sx: {
              bgcolor: isSelected ? "success.light" : null,
              color: isSelected ? "success.contrastText" : null,
              "&:hover": {
                bgcolor: isSelected ? "success.light" : "#9e9e9e",
              },
              cursor: "pointer",
            },
            onClick: handleSelectCell(row.original.sdocId, projectMetadata.id),
          };
        },
        Cell: ({ row }) => {
          const metadata = row.original.metadataDict[projectMetadata.id];
          return (
            <SdocMetadataRendererWithData
              sdocMetadata={{
                ...metadata.currentValue,
                project_metadata_id: metadata.currentValue.project_metadata.id,
              }}
              projectMetadata={projectMetadata}
            />
          );
        },
      });
      result.push({
        id: `${projectMetadata.id.toString()}-suggestion`,
        header: `${projectMetadata.key} (suggested)`,
        muiTableBodyCellProps: ({ row }) => {
          const isSelected = row.original.metadataDict[projectMetadata.id].useSuggested;
          return {
            sx: {
              bgcolor: isSelected ? "success.light" : null,
              color: isSelected ? "success.contrastText" : null,
              "&:hover": {
                bgcolor: isSelected ? "success.light" : "#9e9e9e",
              },
              cursor: "pointer",
            },
            onClick: handleSelectCell(row.original.sdocId, projectMetadata.id),
          };
        },
        Cell: ({ row }) => {
          const metadata = row.original.metadataDict[projectMetadata.id];
          return metadata.suggestedValue ? (
            <SdocMetadataRendererWithData
              sdocMetadata={{
                ...metadata.suggestedValue,
                project_metadata_id: metadata.suggestedValue.project_metadata.id,
              }}
              projectMetadata={projectMetadata}
            />
          ) : (
            <>empty</>
          );
        },
      });
    }

    return result;
  }, [projectMetadataDict]);

  // table
  const table = useMaterialReactTable<MetadataExtractionResultRow>({
    data: theRows,
    columns: columns,
    getRowId: (row) => `${row.sdocId}`,
    // state
    state: {
      rowSelection: rowSelectionModel,
    },
    // selection
    enableRowSelection: true,
    positionToolbarAlertBanner: "bottom",
    onRowSelectionChange: setRowSelectionModel,
    // style
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      style: { flexGrow: 1 },
    },
    // virtualization (scrolling instead of pagination)
    enablePagination: false,
    enableRowVirtualization: true,
    // hide columns per default
    initialState: {
      columnVisibility: {
        id: false,
      },
    },
    // toolbars
    enableBottomToolbar: true,
    renderTopToolbarCustomActions: ({ table }) => (
      <Stack direction="row" alignItems="center" gap={0.5} mx={1}>
        <Typography variant="body1" mr={1}>
          Strategy:
        </Typography>
        <Button
          disabled={buttonsDisabled}
          variant="contained"
          onClick={applyCurrentMetadata(table.getSelectedRowModel())}
        >
          Use Current
        </Button>
        <Button
          disabled={buttonsDisabled}
          variant="contained"
          onClick={applySuggestedMetadata(table.getSelectedRowModel())}
        >
          Use Suggested
        </Button>
      </Stack>
    ),
    renderToolbarInternalActions: ({ table }) => (
      <Stack direction="row" spacing={1}>
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Stack>
    ),
    renderBottomToolbarCustomActions: () => (
      <DialogActions sx={{ width: "100%", p: 0 }}>
        <Box flexGrow={1} />
        <Button onClick={handleClose}>Discard results & close</Button>
        <LoadingButton
          variant="contained"
          startIcon={<LabelIcon />}
          onClick={handleUpdateBulkMetadata}
          loading={updateBulkMetadataMutation.isPending}
          loadingPosition="start"
        >
          Update metadata
        </LoadingButton>
      </DialogActions>
    ),
  });

  return <MaterialReactTable table={table} />;
}

export default MetadataExtractionResultStepTable;
