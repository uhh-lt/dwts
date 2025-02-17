import { Card, CardContent, CardHeader, CardProps, Stack, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_SortingState,
  MRT_TableOptions,
  MRT_VisibilityState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { ElasticSearchDocumentHit } from "../../../api/openapi/models/ElasticSearchDocumentHit.ts";
import { MemoColumns } from "../../../api/openapi/models/MemoColumns.ts";
import { PaginatedElasticSearchDocumentHits } from "../../../api/openapi/models/PaginatedElasticSearchDocumentHits.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { MemoService } from "../../../api/openapi/services/MemoService.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { useTableInfiniteScroll } from "../../../utils/useTableInfiniteScroll.ts";
import { MyFilter, createEmptyFilter } from "../../FilterDialog/filterUtils.ts";
import MemoRenderer from "../MemoRenderer.tsx";
import MemoTableOptionsMenu from "./MemoTableOptionsMenu.tsx";
import MemoToolbarLeft from "./MemoToolbarLeft.tsx";
import { MemoToolbarProps } from "./MemoToolbarProps.ts";
import MemoToolbarRight from "./MemoToolbarRight.tsx";
import { useInitMemoFilterSlice } from "./useInitMemoFilterSlice.ts";

const fetchSize = 20;
const flatMapData = (page: PaginatedElasticSearchDocumentHits) => page.hits;

export interface MemoTableProps {
  title?: string;
  projectId: number;
  filterName: string;
  // selection
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<ElasticSearchDocumentHit>["onRowSelectionChange"];
  // sorting
  sortingModel: MRT_SortingState;
  onSortingChange: MRT_TableOptions<ElasticSearchDocumentHit>["onSortingChange"];
  // column visibility
  columnVisibilityModel: MRT_VisibilityState;
  onColumnVisibilityChange: MRT_TableOptions<ElasticSearchDocumentHit>["onColumnVisibilityChange"];
  // components
  cardProps?: CardProps;
  positionToolbarAlertBanner?: MRT_TableOptions<ElasticSearchDocumentHit>["positionToolbarAlertBanner"];
  renderToolbarInternalActions?: (props: MemoToolbarProps) => React.ReactNode;
  renderTopToolbarCustomActions?: (props: MemoToolbarProps) => React.ReactNode;
  renderBottomToolbarCustomActions?: (props: MemoToolbarProps) => React.ReactNode;
}

function SearchMemoTable({
  title,
  projectId,
  filterName,
  rowSelectionModel,
  onRowSelectionChange,
  sortingModel,
  onSortingChange,
  columnVisibilityModel,
  onColumnVisibilityChange,
  cardProps,
  renderToolbarInternalActions = MemoToolbarRight,
  renderTopToolbarCustomActions = MemoToolbarLeft,
  renderBottomToolbarCustomActions,
}: MemoTableProps) {
  // local state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchContent, setIsSearchContent] = useState<boolean>(false);

  // filtering
  const filter = useAppSelector((state) => state.memoFilter.filter[filterName]) || createEmptyFilter(filterName);

  // virtualization
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitMemoFilterSlice({ projectId });
  const columns = useMemo(() => {
    if (!tableInfo) return [];

    const result = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<ElasticSearchDocumentHit> = {
        id: column.column,
        accessorFn: () => null,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case MemoColumns.M_TITLE:
          return {
            ...colDef,
            size: 100,
            Cell: ({ row }) => <MemoRenderer memo={row.original.document_id} showTitle />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case MemoColumns.M_CONTENT:
          return {
            ...colDef,
            size: 360,
            Cell: ({ row }) => <MemoRenderer memo={row.original.document_id} showContent />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case MemoColumns.M_STARRED:
          return {
            ...colDef,
            Cell: ({ row }) => <MemoRenderer memo={row.original.document_id} showStar />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case MemoColumns.M_USER_ID:
          return {
            ...colDef,
            Cell: ({ row }) => <MemoRenderer memo={row.original.document_id} showUser />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        default:
          return {
            ...colDef,
            Cell: () => <i>Cannot render column {column.column}</i>,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
      }
    });

    // custom columns
    const attachedToCell = {
      id: "attached_to",
      header: "Attached To",
      enableSorting: false,
      accessorFn: () => null,
      Cell: ({ row }) => <MemoRenderer memo={row.original.document_id} showAttachedObject attachedObjectLink />,
    } as MRT_ColumnDef<ElasticSearchDocumentHit>;

    // unwanted columns are set to null, so we filter those out
    return [...result, attachedToCell];
  }, [tableInfo]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<PaginatedElasticSearchDocumentHits>({
    queryKey: [
      QueryKey.MEMO_TABLE,
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      sortingModel, // refetch when sorting changes
      isSearchContent,
    ],
    queryFn: ({ pageParam }) =>
      MemoService.searchMemos({
        searchQuery: searchQuery || "",
        searchContent: isSearchContent,
        projectId: projectId!,
        requestBody: {
          filter: filter as MyFilter<MemoColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as MemoColumns,
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
  // scroll to top of table when sorting or filter change
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, sortingModel, filter]);

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
      showGlobalFilter: true,
    },
    // search query
    autoResetAll: false,
    manualFiltering: true, // turn of client-side filtering
    enableGlobalFilter: true,
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
    manualSorting: false,
    onSortingChange,
    // column visiblility
    onColumnVisibilityChange,
    // column resizing
    enableColumnResizing: true,
    columnResizeMode: "onEnd",

    // mui components
    muiTablePaperProps: {
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
    positionToolbarAlertBanner: "head-overlay",
    renderTopToolbarCustomActions: renderTopToolbarCustomActions
      ? (props) =>
          renderTopToolbarCustomActions({
            table: props.table,
            filterName,
            anchor: tableContainerRef,
            selectedMemos: flatData.filter((row) => rowSelectionModel[row.document_id]),
          })
      : undefined,
    renderToolbarInternalActions: (props) => (
      <Stack direction="row" spacing={1} alignItems="center">
        <MemoTableOptionsMenu
          isSearchContent={isSearchContent}
          onChangeIsSearchContent={(newValue) => setIsSearchContent(newValue)}
        />
        {renderToolbarInternalActions({
          table: props.table,
          filterName,
          anchor: tableContainerRef,
          selectedMemos: flatData.filter((row) => rowSelectionModel[row.document_id]),
        })}
      </Stack>
    ),
    renderBottomToolbarCustomActions: (props) => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <Typography>
          Fetched {totalFetched} of {totalResults} total memos.
        </Typography>
        {renderBottomToolbarCustomActions &&
          renderBottomToolbarCustomActions({
            table: props.table,
            filterName,
            anchor: tableContainerRef,
            selectedMemos: flatData.filter((row) => rowSelectionModel[row.document_id]),
          })}
      </Stack>
    ),
  });

  return (
    <Card className="myFlexContainer" {...cardProps}>
      {title ? <CardHeader title={title} /> : null}
      <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
        <MaterialReactTable table={table} />
      </CardContent>
    </Card>
  );
}

export default SearchMemoTable;
