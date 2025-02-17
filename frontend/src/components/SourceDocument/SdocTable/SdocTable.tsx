import { Box, Stack, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import parse from "html-react-parser";
import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_SortingState,
  MRT_TableInstance,
  MRT_TableOptions,
  MRT_VisibilityState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { QueryKey } from "../../../api/QueryKey.ts";
import { ElasticSearchDocumentHit } from "../../../api/openapi/models/ElasticSearchDocumentHit.ts";
import { PaginatedElasticSearchDocumentHits } from "../../../api/openapi/models/PaginatedElasticSearchDocumentHits.ts";
import { SdocColumns } from "../../../api/openapi/models/SdocColumns.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { useTableInfiniteScroll } from "../../../utils/useTableInfiniteScroll.ts";
import { FilterActions, FilterState } from "../../FilterDialog/filterSlice.ts";
import { ColumnInfo, MyFilter, createEmptyFilter } from "../../FilterDialog/filterUtils.ts";
import SdocMetadataRenderer from "../../Metadata/SdocMetadataRenderer.tsx";
import SdocAnnotatorsRenderer from "../SdocAnnotatorsRenderer.tsx";
import SdocRenderer from "../SdocRenderer.tsx";
import SdocTagsRenderer from "../SdocTagRenderer.tsx";
import SdocTableToolbar from "./SdocTableToolbar.tsx";
import { DocumentTableFilterActions } from "./documentTableFilterSlice.ts";
import { useInitDocumentTableFilterSlice } from "./useInitDocumentTableFilterSlice.ts";

const fetchSize = 20;
const flatMapData = (page: PaginatedElasticSearchDocumentHits) => page.hits;

export interface DocumentTableActionProps {
  table: MRT_TableInstance<ElasticSearchDocumentHit>;
  selectedDocuments: ElasticSearchDocumentHit[];
}

interface SdocTableProps {
  projectId: number;
  // selection
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<ElasticSearchDocumentHit>["onRowSelectionChange"];
  // sorting
  sortingModel: MRT_SortingState;
  onSortingChange: MRT_TableOptions<ElasticSearchDocumentHit>["onSortingChange"];
  // toolbar
  positionToolbarAlertBanner?: MRT_TableOptions<ElasticSearchDocumentHit>["positionToolbarAlertBanner"];
  renderToolbarInternalActions?: (props: DocumentTableActionProps) => React.ReactNode;
  renderTopToolbarCustomActions?: (props: DocumentTableActionProps) => React.ReactNode;
  renderBottomToolbarCustomActions?: (props: DocumentTableActionProps) => React.ReactNode;
  // filter
  filterName?: string;
  filterStateSelector?: (state: RootState) => FilterState;
  filterActions?: FilterActions;
}

const defaultFilterStateSelector = (state: RootState) => state.documentTableFilter;

function SdocTable(props: SdocTableProps) {
  // global client state (react router)
  const tableInfo = useInitDocumentTableFilterSlice({ projectId: props.projectId });

  if (tableInfo) {
    return <SdocTableContent {...props} tableInfo={tableInfo} />;
  }
  return null;
}

function SdocTableContent({
  projectId,
  rowSelectionModel,
  onRowSelectionChange,
  sortingModel,
  onSortingChange,
  positionToolbarAlertBanner = "top",
  renderToolbarInternalActions,
  renderTopToolbarCustomActions,
  renderBottomToolbarCustomActions,
  filterName = "root",
  filterActions = DocumentTableFilterActions,
  filterStateSelector = defaultFilterStateSelector,
  tableInfo,
}: SdocTableProps & { tableInfo: ColumnInfo[] }) {
  // search query
  const [searchQuery, setSearchQuery] = useState<string | undefined>("");

  // filtering
  const filter =
    useAppSelector((state) => filterStateSelector(state).filter[filterName]) || createEmptyFilter(filterName);

  // virtualization
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const columns = useMemo(() => {
    const result = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<ElasticSearchDocumentHit> = {
        id: column.column,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case SdocColumns.SD_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.document_id} renderDoctypeIcon />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SdocColumns.SD_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.document_id} renderFilename />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SdocColumns.SD_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.document_id} />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SdocColumns.SD_USER_ID_LIST:
          return {
            ...colDef,
            flex: 2,
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
              flex: 2,
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
  }, [tableInfo]);

  // column visiblility
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<MRT_VisibilityState>(() => {
    return columns.reduce((acc, column) => {
      if (!column.id) return acc;
      // this is a normal column
      if (isNaN(parseInt(column.id))) {
        return acc;
        // this is a metadata column
      } else {
        return {
          ...acc,
          [column.id]: false,
        };
      }
    }, {});
  });

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<PaginatedElasticSearchDocumentHits>({
    queryKey: [
      QueryKey.SDOC_TABLE,
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      sortingModel, // refetch when sorting changes
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
    getNextPageParam: (_lastGroup, groups) => {
      return groups.length;
    },
    refetchOnWindowFocus: false,
  });

  // infinite scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { flatData, totalResults, totalFetched, fetchMoreOnScroll } = useTableInfiniteScroll({
    tableContainerRef,
    data,
    isFetching,
    fetchNextPage,
    flatMapData,
  });

  // infinite scrolling reset:
  // scroll to top of table when sorting or filters change
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, sortingModel]);

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
      isLoading: isLoading || columns.length === 0,
      showAlertBanner: isError,
      showProgressBars: isFetching,
    },
    // search query
    manualFiltering: true, // turn of client-side filtering
    onGlobalFilterChange: setSearchQuery,
    // selection
    enableRowSelection: true,
    onRowSelectionChange,
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
    onSortingChange,
    // column visiblility
    onColumnVisibilityChange: setColumnVisibilityModel,
    // detail (highlights)
    renderDetailPanel:
      searchQuery && searchQuery.trim().length > 0
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
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef, //get access to the table container element
      onScroll: (event: UIEvent<HTMLDivElement>) => fetchMoreOnScroll(event.target as HTMLDivElement), //add an event listener to the table container element
      style: { flexGrow: 1 },
    },
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
    // toolbar
    positionToolbarAlertBanner,
    renderTopToolbarCustomActions: renderTopToolbarCustomActions
      ? (props) =>
          renderTopToolbarCustomActions({
            table: props.table,
            selectedDocuments: flatData.filter((row) => rowSelectionModel[row.document_id]),
          })
      : undefined,
    renderToolbarInternalActions: renderToolbarInternalActions
      ? (props) =>
          renderToolbarInternalActions({
            table: props.table,
            selectedDocuments: flatData.filter((row) => rowSelectionModel[row.document_id]),
          })
      : (props) => (
          <SdocTableToolbar
            table={props.table}
            anchor={tableContainerRef}
            filterName={filterName}
            filterActions={filterActions}
            filterStateSelector={filterStateSelector}
          />
        ),
    renderBottomToolbarCustomActions: (props) => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <Typography>
          Fetched {totalFetched} of {totalResults} total documents.
        </Typography>
        {renderBottomToolbarCustomActions &&
          renderBottomToolbarCustomActions({
            table: props.table,
            selectedDocuments: flatData.filter((row) => rowSelectionModel[row.document_id]),
          })}
      </Stack>
    ),
  });

  return <MaterialReactTable table={table} />;
}

export default SdocTable;
