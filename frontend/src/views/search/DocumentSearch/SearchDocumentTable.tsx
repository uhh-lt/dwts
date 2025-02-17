import { Box, Button, Card, Divider, Stack, Toolbar, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import parse from "html-react-parser";
import {
  MRT_ColumnDef,
  MRT_GlobalFilterTextField,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_TableContainer,
  MRT_ToggleDensePaddingButton,
  useMaterialReactTable,
} from "material-react-table";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { QueryKey } from "../../../api/QueryKey.ts";
import { ElasticSearchDocumentHit } from "../../../api/openapi/models/ElasticSearchDocumentHit.ts";
import { PaginatedElasticSearchDocumentHits } from "../../../api/openapi/models/PaginatedElasticSearchDocumentHits.ts";
import { SdocColumns } from "../../../api/openapi/models/SdocColumns.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import ReduxFilterDialog from "../../../components/FilterDialog/ReduxFilterDialog.tsx";
import { MyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import LLMAssistanceButton from "../../../components/LLMDialog/LLMAssistanceButton.tsx";
import SdocMetadataRenderer from "../../../components/Metadata/SdocMetadataRenderer.tsx";
import DeleteSdocsButton from "../../../components/SourceDocument/DeleteSdocsButton.tsx";
import DownloadSdocsButton from "../../../components/SourceDocument/DownloadSdocsButton.tsx";
import SdocAnnotatorsRenderer from "../../../components/SourceDocument/SdocAnnotatorsRenderer.tsx";
import SdocRenderer from "../../../components/SourceDocument/SdocRenderer.tsx";
import SdocTagsRenderer from "../../../components/SourceDocument/SdocTagRenderer.tsx";
import TagMenuButton from "../../../components/Tag/TagMenu/TagMenuButton.tsx";
import { selectSelectedDocumentIds } from "../../../components/tableSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
import { useTableFetchMoreOnScroll, useTransformInfiniteData } from "../../../utils/useTableInfiniteScroll.ts";
import { useInitSearchFilterSlice } from "../useInitSearchFilterSlice.ts";
import SearchOptionsMenu from "./SearchOptionsMenu.tsx";
import { SearchActions } from "./searchSlice.ts";

// this has to match Search.tsx!
const filterStateSelector = (state: RootState) => state.search;
const filterName = "root";

const flatMapData = (page: PaginatedElasticSearchDocumentHits) => page.hits;

interface DocumentTableProps {
  projectId: number;
  onSearchResultsChange?: (sdocIds: number[]) => void;
}

function SearchDocumentTable({ projectId, onSearchResultsChange }: DocumentTableProps) {
  const navigate = useNavigate();

  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux) connected to table state
  const [searchQuery, setSearchQuery] = useReduxConnector(
    (state) => state.search.searchQuery,
    SearchActions.onSearchQueryChange,
  );
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.search.rowSelectionModel,
    SearchActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.search.sortingModel,
    SearchActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.search.columnVisibilityModel,
    SearchActions.onColumnVisibilityChange,
  );
  const [columnSizingModel, setColumnSizingModel] = useReduxConnector(
    (state) => state.search.columnSizingModel,
    SearchActions.onColumnSizingChange,
  );
  const [gridDensity, setGridDensityModel] = useReduxConnector(
    (state) => state.search.gridDensityModel,
    SearchActions.onGridDensityChange,
  );
  const selectedDocumentId = useAppSelector((state) => state.search.selectedDocumentId);
  const dispatch = useAppDispatch();
  const selectedDocumentIds = useAppSelector((state) => selectSelectedDocumentIds(state.search));

  // virtualization
  const toolbarRef = useRef<HTMLDivElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitSearchFilterSlice({ projectId });
  const columns = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<ElasticSearchDocumentHit> = {
        id: column.column,
        accessorFn: () => null,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case SdocColumns.SD_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            size: 100,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.document_id} renderDoctypeIcon />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SdocColumns.SD_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            size: 360,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.document_id} renderFilename />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SdocColumns.SD_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.document_id} />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SdocColumns.SD_USER_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocAnnotatorsRenderer sdocId={row.original.document_id} />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SdocColumns.SD_CODE_ID_LIST:
          return null;
        case SdocColumns.SD_SPAN_ANNOTATIONS:
          return null;
        default:
          // render metadata
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.document_id} projectMetadataId={parseInt(column.column)} />
              ),
            } as MRT_ColumnDef<ElasticSearchDocumentHit>;
          } else {
            return {
              ...colDef,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<ElasticSearchDocumentHit>;
          }
      }
    });

    // unwanted columns are set to null, so we filter those out
    return result.filter((column) => column !== null) as MRT_ColumnDef<ElasticSearchDocumentHit>[];
  }, [tableInfo, user]);

  // search
  const fetchSize = useAppSelector((state) => state.search.fetchSize);
  const filter = useAppSelector((state) => state.search.filter[filterName]);
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<PaginatedElasticSearchDocumentHits>({
    queryKey: [
      QueryKey.SEARCH_TABLE,
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      sortingModel, // refetch when sorting changes
      fetchSize,
    ],
    queryFn: ({ pageParam }) =>
      SearchService.searchSdocs({
        searchQuery: searchQuery || "",
        projectId: projectId!,
        highlight: true,
        expertMode: false,
        requestBody: {
          filter: filter as MyFilter<SdocColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as SdocColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        pageNumber: pageParam as number,
        pageSize: fetchSize,
      }),
    initialPageParam: 0,
    enabled: !!projectId,
    getNextPageParam: (_lastGroup, groups) => {
      return groups.length;
    },
    refetchOnWindowFocus: false,
  });
  const { flatData, totalFetched, totalResults } = useTransformInfiniteData({
    data,
    flatMapData,
  });

  useEffect(() => {
    onSearchResultsChange?.(flatData.map((sdoc) => sdoc.document_id));
  }, [onSearchResultsChange, flatData]);

  // table
  const table = useMaterialReactTable<ElasticSearchDocumentHit>({
    data: flatData,
    columns: columns,
    getRowId: (row) => `${row.document_id}`,
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
    onGlobalFilterChange: setSearchQuery,
    // selection
    enableRowSelection: true,
    onRowSelectionChange: setRowSelectionModel,
    // virtualization
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef: rowVirtualizerInstanceRef,
    rowVirtualizerOptions: { overscan: 4 },
    // filtering
    enableColumnFilters: false,
    // pagination
    enablePagination: false,
    // sorting
    manualSorting: false,
    onSortingChange: setSortingModel,
    // density
    onDensityChange: setGridDensityModel,
    // column visiblility
    onColumnVisibilityChange: setColumnVisibilityModel,
    // column resizing
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    onColumnSizingChange: setColumnSizingModel,
    // detail (highlights)
    renderDetailPanel:
      searchQuery && searchQuery.trim().length > 0 && flatData.length > 0
        ? ({ row }) =>
            row.original.highlights ? (
              <Box className="search-result-highlight">
                {row.original.highlights.map((highlight, index) => (
                  <Typography key={`sdoc-${row.original.document_id}-highlight-${index}`} m={0.5}>
                    {parse(highlight)}
                  </Typography>
                ))}
              </Box>
            ) : null
        : undefined,
    // mui components
    muiTableBodyRowProps: ({ row }) => ({
      onClick: (event) => {
        if (event.detail >= 2) {
          navigate(`/project/${projectId}/annotation/${row.original.document_id}`);
        } else {
          dispatch(SearchActions.onToggleSelectedDocumentIdChange(row.original.document_id));
        }
      },
      sx: {
        backgroundColor: selectedDocumentId === row.original.document_id ? "lightgrey !important" : undefined,
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

  // infinite scrolling
  // fetch more
  const fetchMoreOnScroll = useTableFetchMoreOnScroll({
    tableContainerRef: table.refs.tableContainerRef,
    isFetching,
    fetchNextPage,
    totalFetched,
    totalResults,
  });
  // reset
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, searchQuery, filter, sortingModel]);

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
          filterActions={SearchActions}
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
            <LLMAssistanceButton sdocIds={selectedDocumentIds} projectId={projectId} />
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <MRT_GlobalFilterTextField table={table} />
        <SearchOptionsMenu />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Toolbar>
      <Card elevation={8} sx={{ height: "100%", display: "flex", flexDirection: "column", m: 2 }}>
        <MRT_TableContainer
          table={table}
          style={{ flexGrow: 1 }}
          onScroll={(event) => fetchMoreOnScroll(event.target as HTMLDivElement)}
        />
        <Box sx={{ p: 1 }}>
          <Divider />
          <Stack direction="row" alignItems="top" pt={0.5}>
            <Typography variant="body2" color="textSecondary" pt={0.5} mr={1}>
              Fetched {totalFetched} of {totalResults} documents
            </Typography>
            <Button size="small" onClick={() => dispatch(SearchActions.onFetchSizeChange(totalResults))}>
              Fetch All
            </Button>
          </Stack>
        </Box>
      </Card>
    </>
  );
}

export default SearchDocumentTable;
