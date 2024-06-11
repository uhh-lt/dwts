import { Box, Card, Toolbar } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_ColumnSizingState,
  MRT_DensityState,
  MRT_GlobalFilterTextField,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_SortingState,
  MRT_TableContainer,
  MRT_ToggleDensePaddingButton,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SearchColumns } from "../../../api/openapi/models/SearchColumns.ts";
import { SimSearchSentenceHit } from "../../../api/openapi/models/SimSearchSentenceHit.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import ReduxFilterDialog from "../../../components/FilterDialog/ReduxFilterDialog.tsx";
import SdocMetadataRenderer from "../../../components/Metadata/SdocMetadataRenderer.tsx";
import DeleteSdocsButton from "../../../components/SourceDocument/DeleteSdocsButton.tsx";
import DownloadSdocsButton from "../../../components/SourceDocument/DownloadSdocsButton.tsx";
import SdocAnnotatorsRenderer from "../../../components/SourceDocument/SdocAnnotatorsRenderer.tsx";
import SdocRenderer from "../../../components/SourceDocument/SdocRenderer.tsx";
import SdocSentenceRenderer from "../../../components/SourceDocument/SdocSentenceRenderer.tsx";
import SdocTagsRenderer from "../../../components/SourceDocument/SdocTagRenderer.tsx";
import TagMenuButton from "../../../components/Tag/TagMenu/TagMenuButton.tsx";
import { selectSelectedDocumentIds } from "../../../components/tableSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { SearchFilterActions } from "../searchFilterSlice.ts";
import { useInitSearchFilterSlice } from "../useInitSearchFilterSlice.ts";
import SentenceSimilaritySearchOptionsMenu from "./SentenceSimilaritySearchOptionsMenu.tsx";
import { SentenceSearchActions } from "./sentenceSearchSlice.ts";

// this has to match SentenceSimilaritySearch.tsx!
const filterStateSelector = (state: RootState) => state.searchFilter;
const filterName = "sentenceSimilaritySearch";

interface SentenceSimilaritySearchTableProps {
  projectId: number;
  data: SimSearchSentenceHit[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
}

function SentenceSimilaritySearchTable({
  projectId,
  data,
  isLoading,
  isFetching,
  isError,
}: SentenceSimilaritySearchTableProps) {
  const navigate = useNavigate();

  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux)
  const searchQuery = useAppSelector((state) => state.sentenceSearch.searchQuery);
  const rowSelectionModel = useAppSelector((state) => state.sentenceSearch.rowSelectionModel);
  const selectedDocumentId = useAppSelector((state) => state.sentenceSearch.selectedDocumentId);
  const sortingModel = useAppSelector((state) => state.sentenceSearch.sortingModel);
  const columnVisibilityModel = useAppSelector((state) => state.sentenceSearch.columnVisibilityModel);
  const columnSizingModel = useAppSelector((state) => state.sentenceSearch.columnSizingModel);
  const gridDensity = useAppSelector((state) => state.sentenceSearch.gridDensity);
  const dispatch = useAppDispatch();
  const selectedDocumentIds = useAppSelector((state) => selectSelectedDocumentIds(state.sentenceSearch));

  // virtualization
  const toolbarRef = useRef<HTMLDivElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitSearchFilterSlice({ projectId });
  const columns = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<SimSearchSentenceHit> = {
        id: column.column,
        accessorFn: () => null,
        header: column.label,
        enableSorting: false,
      };

      switch (column.column) {
        case SearchColumns.SC_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            size: 100,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} renderDoctypeIcon />,
          } as MRT_ColumnDef<SimSearchSentenceHit>;
        case SearchColumns.SC_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            size: 360,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} renderFilename />,
          } as MRT_ColumnDef<SimSearchSentenceHit>;
        case SearchColumns.SC_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdoc_id} />,
          } as MRT_ColumnDef<SimSearchSentenceHit>;
        case SearchColumns.SC_USER_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocAnnotatorsRenderer sdocId={row.original.sdoc_id} />,
          } as MRT_ColumnDef<SimSearchSentenceHit>;
        case SearchColumns.SC_CODE_ID_LIST:
          return null;
        case SearchColumns.SC_SPAN_ANNOTATIONS:
          return null;
        default:
          // render metadata
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.sdoc_id} projectMetadataId={parseInt(column.column)} />
              ),
            } as MRT_ColumnDef<SimSearchSentenceHit>;
          } else {
            return {
              ...colDef,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<SimSearchSentenceHit>;
          }
      }
    });

    // custom columns
    const scoreCell = {
      id: "score",
      header: "Score",
      enableSorting: false,
      accessorFn: (row) => row.score.toFixed(2),
    } as MRT_ColumnDef<SimSearchSentenceHit>;

    const sentenceCell = {
      id: "sentence",
      header: "Sentence",
      enableSorting: false,
      size: 360,
      accessorFn: () => null,
      Cell: ({ row }) => <SdocSentenceRenderer sdoc={row.original.sdoc_id} sentenceId={row.original.sentence_id} />,
    } as MRT_ColumnDef<SimSearchSentenceHit>;

    // unwanted columns are set to null, so we filter those out
    return [scoreCell, sentenceCell, ...result].filter(
      (column) => column !== null,
    ) as MRT_ColumnDef<SimSearchSentenceHit>[];
  }, [tableInfo, user]);

  // table
  const table = useMaterialReactTable<SimSearchSentenceHit>({
    data: data || [],
    columns: columns,
    getRowId: (row) => `${row.sdoc_id}-${row.sentence_id}`,
    // state
    state: {
      globalFilter: searchQuery,
      rowSelection: rowSelectionModel,
      sorting: sortingModel,
      columnVisibility: columnVisibilityModel,
      columnSizing: columnSizingModel,
      density: gridDensity,
      isLoading: isLoading || columns.length === 0,
      showAlertBanner: isError,
      showProgressBars: isFetching,
      showGlobalFilter: true,
    },
    // search query
    autoResetAll: false,
    manualFiltering: true, // turn of client-side filtering
    // enableGlobalFilter: true,
    onGlobalFilterChange: (globalFilterUpdater) => {
      let newSearchQuery: string | undefined;
      if (typeof globalFilterUpdater === "function") {
        newSearchQuery = globalFilterUpdater(searchQuery);
      } else {
        newSearchQuery = globalFilterUpdater;
      }
      dispatch(SentenceSearchActions.onSearchQueryChange(newSearchQuery || ""));
    },
    // selection
    enableRowSelection: true,
    onRowSelectionChange: (rowSelectionUpdater) => {
      let newRowSelectionModel: MRT_RowSelectionState;
      if (typeof rowSelectionUpdater === "function") {
        newRowSelectionModel = rowSelectionUpdater(rowSelectionModel);
      } else {
        newRowSelectionModel = rowSelectionUpdater;
      }
      dispatch(SentenceSearchActions.onRowSelectionModelChange(newRowSelectionModel));
    },
    // virtualization
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef: rowVirtualizerInstanceRef,
    rowVirtualizerOptions: { overscan: 4 },
    // filtering
    enableColumnFilters: false,
    // pagination
    enablePagination: false,
    // sorting
    manualSorting: true,
    onSortingChange: (sortingUpdater) => {
      let newSortingModel: MRT_SortingState;
      if (typeof sortingUpdater === "function") {
        newSortingModel = sortingUpdater(sortingModel);
      } else {
        newSortingModel = sortingUpdater;
      }
      dispatch(SentenceSearchActions.onSortModelChange(newSortingModel));
    },
    // density
    onDensityChange: (densityUpdater) => {
      let newGridDensity: MRT_DensityState;
      if (typeof densityUpdater === "function") {
        newGridDensity = densityUpdater(gridDensity);
      } else {
        newGridDensity = densityUpdater;
      }
      dispatch(SentenceSearchActions.onGridDensityChange(newGridDensity));
    },
    // column visiblility
    onColumnVisibilityChange: (updater) => {
      const newVisibilityModel = updater instanceof Function ? updater(columnVisibilityModel) : updater;
      dispatch(SentenceSearchActions.onColumnVisibilityChange(newVisibilityModel));
    },
    // column resizing
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    onColumnSizingChange: (sizingUpdater) => {
      let newColumnSizingModel: MRT_ColumnSizingState;
      if (typeof sizingUpdater === "function") {
        newColumnSizingModel = sizingUpdater(columnSizingModel);
      } else {
        newColumnSizingModel = sizingUpdater;
      }
      dispatch(SentenceSearchActions.onColumnSizingChange(newColumnSizingModel));
    },
    // mui components
    muiTableBodyRowProps: ({ row }) => ({
      onClick: (event) => {
        if (event.detail >= 2) {
          navigate(`/project/${projectId}/annotation/${row.original.sdoc_id}`);
        } else {
          dispatch(SentenceSearchActions.onToggleSelectedDocumentIdChange(row.original.sdoc_id));
        }
      },
      sx: {
        backgroundColor: selectedDocumentId === row.original.sdoc_id ? "lightgrey !important" : undefined,
      },
    }),
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : { style: { width: "100%" }, className: "fixAlertBanner" },
    // toolbar
    positionToolbarAlertBanner: "head-overlay",
  });

  return (
    <>
      <Toolbar
        variant="dense"
        sx={{
          zIndex: (theme) => theme.zIndex.appBar + 1,
          bgcolor: (theme) => theme.palette.background.paper,
          borderBottom: "1px solid #e8eaed",
          boxShadow: 4,
          justifyContent: "center",
          gap: 1,
        }}
        ref={toolbarRef}
      >
        <ReduxFilterDialog
          anchorEl={toolbarRef.current}
          buttonProps={{ size: "small" }}
          filterName={filterName}
          filterStateSelector={filterStateSelector}
          filterActions={SearchFilterActions}
          transformOrigin={{ horizontal: "left", vertical: "top" }}
          anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        />
        {selectedDocumentIds.length > 0 && (
          <>
            <TagMenuButton
              selectedSdocIds={selectedDocumentIds}
              popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
            />
            <DeleteSdocsButton sdocIds={selectedDocumentIds} navigateTo="../search" />
            <DownloadSdocsButton sdocIds={selectedDocumentIds} />
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <MRT_GlobalFilterTextField table={table} />
        <SentenceSimilaritySearchOptionsMenu />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Toolbar>
      <Card elevation={8} sx={{ height: "100%", display: "flex", flexDirection: "column", m: 2 }}>
        <MRT_TableContainer table={table} style={{ flexGrow: 1 }} />
      </Card>
    </>
  );
}

export default SentenceSimilaritySearchTable;
