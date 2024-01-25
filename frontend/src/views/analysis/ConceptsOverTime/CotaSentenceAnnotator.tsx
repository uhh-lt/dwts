import BorderColorIcon from "@mui/icons-material/BorderColor";
import CircleIcon from "@mui/icons-material/Circle";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import { Box, Button, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import {
  DataGrid,
  GridColDef,
  GridEventListener,
  GridFooterContainer,
  GridRowSelectionModel,
  GridSortModel,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
  useGridApiContext,
  useGridApiRef,
} from "@mui/x-data-grid";
import { padStart } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import CotaHooks from "../../../api/CotaHooks";
import { COTAConcept, COTARead, COTASentence, COTASentenceID, DateGroupBy } from "../../../api/openapi";
import SdocRenderer from "../../../components/DataGrid/SdocRenderer";
import { renderTextCellExpand } from "../../../components/DataGrid/renderTextCellExpand";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { dateToLocaleDate } from "../../../utils/DateUtils";
import TablePaginationActions from "../../search/ToolBar/ToolBarElements/TablePaginationActions";
import { CotaActions } from "./cotaSlice";

interface CotaSentenceAnnotatorProps {
  cota: COTARead;
}

function CotaSentenceAnnotator2({ cota }: CotaSentenceAnnotatorProps) {
  // global client state (redux)
  const selectedConceptId = useAppSelector((state) => state.cota.selectedConceptId);
  const selectedDate = useAppSelector((state) => state.cota.selectedDate);

  // computed
  const selectedConcept = useMemo(() => {
    return cota.concepts.find((c) => c.id === selectedConceptId);
  }, [cota, selectedConceptId]);

  let title = "Similar sentences";
  if (selectedConcept) {
    title += ` for concept ${selectedConcept.name}`;
  }
  if (selectedDate) {
    title += ` on date ${selectedDate}`;
  }

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title={title}
        subheader="Annotate sentences to improve the timeline analysis"
      />
      <CardContent className="myFlexFillAllContainer" style={{ ...(selectedConcept && { padding: 0 }) }}>
        {!selectedConcept ? (
          <>Select a concept from the concept list to see similar sentences</>
        ) : (
          <SimilarSentencesTable cota={cota} concept={selectedConcept} key={selectedConcept.id} />
        )}
      </CardContent>
    </Card>
  );
}

interface SimilarSentencesTableProps {
  cota: COTARead;
  concept: COTAConcept;
}

function SimilarSentencesTable({ cota, concept }: SimilarSentencesTableProps) {
  // local state
  const apiRef = useGridApiRef();
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);
  const [sortModel, setSortModel] = useState<GridSortModel>([
    {
      field: "similarity",
      sort: "desc",
    },
  ]);

  // global client state (redux)
  const provenanceSdocIdSentenceId = useAppSelector((state) => state.cota.provenanceSdocIdSentenceId);
  const selectedDate = useAppSelector((state) => state.cota.selectedDate);

  // scroll
  useEffect(() => {
    apiRef.current &&
      provenanceSdocIdSentenceId &&
      requestIdleCallback(() => {
        const pageSize = apiRef.current.state.pagination.paginationModel.pageSize;
        const getSortedRowIds = apiRef.current.getSortedRowIds();
        const rowIndex = getSortedRowIds.indexOf(provenanceSdocIdSentenceId);
        // set page
        const page = Math.floor(rowIndex / pageSize);
        apiRef.current.setPage(page);
        // set focus
        setTimeout(() => {
          apiRef.current.setCellFocus(provenanceSdocIdSentenceId, "sentenceId");
        }, 500);
      });
  }, [apiRef, provenanceSdocIdSentenceId]);

  // computed
  const searchSpace = useMemo(() => {
    if (!selectedDate) return cota.search_space;

    let result: COTASentence[] = [];
    cota.search_space.forEach((cotaSentence) => {
      // prepare date
      const date = dateToLocaleDate(cotaSentence.date);
      let dateStr = "";
      switch (cota.timeline_settings.group_by) {
        case DateGroupBy.DAY:
          dateStr = date.getFullYear() + "-" + padStart(`${date.getMonth() + 1}`, 2, "0") + "-" + date.getDate();
          break;
        case DateGroupBy.MONTH:
          dateStr = date.getFullYear() + "-" + padStart(`${date.getMonth() + 1}`, 2, "0");
          break;
        case DateGroupBy.YEAR:
          dateStr = date.getFullYear().toString();
          break;
      }

      if (dateStr === selectedDate) {
        result.push(cotaSentence);
      }
    });
    return result;
  }, [cota, selectedDate]);

  const columns: GridColDef<COTASentence>[] = useMemo(() => {
    const conceptDict = cota.concepts.reduce(
      (acc, concept) => {
        acc[concept.id] = concept;
        return acc;
      },
      {} as Record<string, COTAConcept>,
    );

    return [
      {
        field: "similarity",
        headerName: "Similarity",
        renderCell: (params) => <>{(params.row.concept_similarities[concept.id] * 100.0).toFixed(2)}</>,
        valueGetter: (params) => params.row.concept_similarities[concept.id],
      },
      {
        field: "probability",
        headerName: "Probability",
        renderCell: (params) => <>{(params.row.concept_probabilities[concept.id] * 100.0).toFixed(2)}</>,
        valueGetter: (params) => params.row.concept_probabilities[concept.id],
      },
      {
        field: "annotation",
        headerName: "Annotation",
        renderCell: (params) => (
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: params.row.concept_annotation && conceptDict[params.row.concept_annotation].color,
              borderRadius: "100%",
            }}
          />
        ),
      },
      {
        field: "sdocId",
        headerName: "Document",
        flex: 2,
        renderCell: (params) => <SdocRenderer sdoc={params.row.sdoc_id} link renderFilename />,
      },
      {
        field: "sentenceId",
        headerName: "Sentence",
        flex: 3,
        renderCell: (params) =>
          renderTextCellExpand({
            ...params,
            value: params.row.text,
          }),
      },
    ] as GridColDef<COTASentence>[];
  }, [concept.id, cota.concepts]);

  // actions
  const annotateCotaSentences = CotaHooks.useAnnotateCotaSentences();
  const handleAnnotateSentences = (sentences: COTASentenceID[], conceptId: string | null) => {
    annotateCotaSentences.mutate(
      {
        cotaId: cota.id,
        conceptId: conceptId,
        requestBody: sentences,
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Updated CotA '${data.name}'`,
            severity: "success",
          });
          setRowSelectionModel([]);
        },
      },
    );
  };

  const removeCotaSentences = CotaHooks.useRemoveCotaSentences();
  const handleRemoveSentences = (sentences: COTASentenceID[]) => {
    removeCotaSentences.mutate(
      {
        cotaId: cota.id,
        requestBody: sentences,
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Updated CotA '${data.name}'`,
            severity: "success",
          });
          setRowSelectionModel([]);
        },
      },
    );
  };

  const dispatch = useAppDispatch();
  const handleRowClick: GridEventListener<"rowClick"> = (params) => {
    dispatch(CotaActions.onSentenceAnnotatorRowClick(params.id as string));
  };

  return (
    <DataGrid
      apiRef={apiRef}
      rows={searchSpace}
      columns={columns}
      autoPageSize
      getRowId={(row) => `${row.sdoc_id}-${row.sentence_id}`}
      style={{ border: "none" }}
      disableColumnFilter
      // interaction
      onRowClick={handleRowClick}
      // selection
      checkboxSelection
      disableRowSelectionOnClick
      rowSelectionModel={rowSelectionModel}
      onRowSelectionModelChange={(newSelection) => setRowSelectionModel(newSelection)}
      // custom toolbar
      slots={{
        toolbar: SimilarSentencesToolbar,
        footer: CustomFooter,
      }}
      slotProps={{
        toolbar: {
          selectedRows: rowSelectionModel,
          onAnnotateSentences: handleAnnotateSentences,
          onRemoveSentences: handleRemoveSentences,
          concepts: cota.concepts,
        },
      }}
      // always sort by similarity desc by default
      sortModel={sortModel}
      onSortModelChange={(model) => setSortModel(model)}
    />
  );
}

function CustomFooter(props: any) {
  const apiRef = useGridApiContext();

  const page = apiRef.current.state.pagination.paginationModel.page;
  const rowsPerPage = apiRef.current.state.pagination.paginationModel.pageSize;
  const count = apiRef.current.state.rows.totalRowCount;
  const text = `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, count)} of ${count}`;
  return (
    <GridFooterContainer>
      <Box flexGrow={1} />
      <Typography>{text}</Typography>
      <TablePaginationActions
        count={count}
        page={page}
        onPageChange={(event, value) => apiRef.current.setPage(value)}
        rowsPerPage={rowsPerPage}
      />
    </GridFooterContainer>
  );
}

interface SimilarSentencesToolbarProps {
  concepts: COTAConcept[];
  selectedRows: GridRowSelectionModel;
  onAnnotateSentences: (sentences: COTASentenceID[], conceptId: string | null) => void;
  onRemoveSentences: (sentences: COTASentenceID[]) => void;
}

function SimilarSentencesToolbar({
  selectedRows,
  onAnnotateSentences,
  onRemoveSentences,
  concepts,
}: SimilarSentencesToolbarProps) {
  // actions
  const handleAnnotateSentences = (conceptId: string | null) => {
    setAnchorEl(null);
    onAnnotateSentences(
      selectedRows.map((row) => {
        // row is a string in the format of `${row.sdocId}-${row.sentenceId}`
        const [sdocId, sentenceId] = row.toString().split("-");
        return {
          sentence_id: parseInt(sentenceId),
          sdoc_id: parseInt(sdocId),
        };
      }),
      conceptId,
    );
  };

  const handleRemoveSentences = () => {
    onRemoveSentences(
      selectedRows.map((row) => {
        // row is a string in the format of `${row.sdocId}-${row.sentenceId}`
        const [sdocId, sentenceId] = row.toString().split("-");
        return {
          sentence_id: parseInt(sentenceId),
          sdoc_id: parseInt(sdocId),
        };
      }),
    );
  };

  // annotation menu
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <GridToolbarContainer>
      {selectedRows.length > 0 && (
        <Button startIcon={<BorderColorIcon />} size="small" onClick={handleClick}>
          Annotate ({selectedRows.length})
        </Button>
      )}
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => handleAnnotateSentences(null)}>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear annotation</ListItemText>
        </MenuItem>
        {concepts.map((concept) => (
          <MenuItem onClick={() => handleAnnotateSentences(concept.id)}>
            <ListItemIcon>
              <CircleIcon fontSize="small" style={{ color: concept.color }} />
            </ListItemIcon>
            <ListItemText>{concept.name}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
      {selectedRows.length > 0 && (
        <Button startIcon={<DeleteIcon />} size="small" onClick={() => handleRemoveSentences()}>
          Remove ({selectedRows.length}) sentence{selectedRows.length > 0 ? "s" : null}
        </Button>
      )}
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
    </GridToolbarContainer>
  );
}

export default CotaSentenceAnnotator2;
