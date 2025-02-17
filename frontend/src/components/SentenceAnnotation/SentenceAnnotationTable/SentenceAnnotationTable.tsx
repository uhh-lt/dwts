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
import { useEffect, useMemo, useRef } from "react";
import { QueryKey } from "../../../api/QueryKey.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { SentAnnoColumns } from "../../../api/openapi/models/SentAnnoColumns.ts";
import { SentenceAnnotationRow } from "../../../api/openapi/models/SentenceAnnotationRow.ts";
import { SentenceAnnotationSearchResult } from "../../../api/openapi/models/SentenceAnnotationSearchResult.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { useTableInfiniteScroll } from "../../../utils/useTableInfiniteScroll.ts";
import CodeRenderer from "../../Code/CodeRenderer.tsx";
import { MyFilter, createEmptyFilter } from "../../FilterDialog/filterUtils.ts";
import MemoRenderer2 from "../../Memo/MemoRenderer2.tsx";
import SdocMetadataRenderer from "../../Metadata/SdocMetadataRenderer.tsx";
import SdocTagsRenderer from "../../SourceDocument/SdocTagRenderer.tsx";
import UserRenderer from "../../User/UserRenderer.tsx";
import SATToolbar, { SEATToolbarProps } from "./SEATToolbar.tsx";
import SdocAnnotationLink from "./SdocAnnotationLink.tsx";
import { useInitSEATFilterSlice } from "./useInitSEATFilterSlice.ts";

const fetchSize = 20;
const flatMapData = (page: SentenceAnnotationSearchResult) => page.data;

export interface SentenceAnnotationTableProps {
  title?: string;
  projectId: number;
  filterName: string;
  // selection
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<SentenceAnnotationRow>["onRowSelectionChange"];
  // sorting
  sortingModel: MRT_SortingState;
  onSortingChange: MRT_TableOptions<SentenceAnnotationRow>["onSortingChange"];
  // column visibility
  columnVisibilityModel: MRT_VisibilityState;
  onColumnVisibilityChange: MRT_TableOptions<SentenceAnnotationRow>["onColumnVisibilityChange"];
  // components
  cardProps?: CardProps;
  positionToolbarAlertBanner?: MRT_TableOptions<SentenceAnnotationRow>["positionToolbarAlertBanner"];
  renderToolbarInternalActions?: (props: SEATToolbarProps) => React.ReactNode;
  renderTopToolbarCustomActions?: (props: SEATToolbarProps) => React.ReactNode;
  renderBottomToolbarCustomActions?: (props: SEATToolbarProps) => React.ReactNode;
}

function SentenceAnnotationTable({
  title = "Sentence Annotation Table",
  projectId,
  filterName,
  rowSelectionModel,
  onRowSelectionChange,
  sortingModel,
  onSortingChange,
  columnVisibilityModel,
  onColumnVisibilityChange,
  cardProps,
  positionToolbarAlertBanner = "top",
  renderToolbarInternalActions = SATToolbar,
  renderTopToolbarCustomActions,
  renderBottomToolbarCustomActions,
}: SentenceAnnotationTableProps) {
  // global client state (react router)
  const { user } = useAuth();
  const userId = user?.id;

  // filtering
  const filter = useAppSelector((state) => state.seatFilter.filter[filterName]) || createEmptyFilter(filterName);

  // virtualization
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitSEATFilterSlice({ projectId });
  const columns: MRT_ColumnDef<SentenceAnnotationRow>[] = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result = tableInfo.map((column) => {
      const colDef = {
        id: column.column,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case SentAnnoColumns.SENT_ANNO_SOURCE_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            accessorFn: (row) => row.sdoc.filename,
            Cell: ({ row }) => <SdocAnnotationLink sdoc={row.original.sdoc} annotation={row.original} />,
          } as MRT_ColumnDef<SentenceAnnotationRow>;
        case SentAnnoColumns.SENT_ANNO_DOCUMENT_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            accessorFn: (row) => row.tag_ids,
            Cell: ({ row }) => <SdocTagsRenderer tagIds={row.original.tag_ids} />,
          } as MRT_ColumnDef<SentenceAnnotationRow>;
        case SentAnnoColumns.SENT_ANNO_CODE_ID:
          return {
            ...colDef,
            accessorFn: (row) => row.code,
            Cell: ({ row }) => <CodeRenderer code={row.original.code} />,
          } as MRT_ColumnDef<SentenceAnnotationRow>;
        case SentAnnoColumns.SENT_ANNO_USER_ID:
          return {
            ...colDef,
            accessorFn: (row) => row.user_id,
            Cell: ({ row }) => <UserRenderer user={row.original.user_id} />,
          } as MRT_ColumnDef<SentenceAnnotationRow>;
        case SentAnnoColumns.SENT_ANNO_MEMO_CONTENT:
          return {
            ...colDef,
            accessorFn: (row) => row.memo,
            Cell: ({ row }) =>
              user ? (
                <MemoRenderer2
                  attachedObjectType={AttachedObjectType.SENTENCE_ANNOTATION}
                  attachedObjectId={row.original.id}
                  showTitle={false}
                  showContent
                  showIcon={false}
                />
              ) : null,
          } as MRT_ColumnDef<SentenceAnnotationRow>;
        // case SentAnnoColumns.SENT_ANNO_SPAN_TEXT:
        //   return {
        //     ...colDef,
        //     accessorFn: (row) => row.text,
        //   } as MRT_ColumnDef<SentenceAnnotationRow>;
        default:
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              accessorFn: () => null,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.sdoc.id} projectMetadataId={parseInt(column.column)} />
              ),
            } as MRT_ColumnDef<SentenceAnnotationRow>;
          } else {
            return {
              ...colDef,
              accessorFn: () => null,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<SentenceAnnotationRow>;
          }
      }
    });

    return [
      {
        id: "text",
        header: "Annotated Sentences",
        enableSorting: false,
        accessorFn: (row) => row.text,
      } as MRT_ColumnDef<SentenceAnnotationRow>,
      ...result,
    ];
  }, [tableInfo, user]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<SentenceAnnotationSearchResult>({
    queryKey: [
      QueryKey.SENT_ANNO_TABLE,
      projectId,
      filter, //refetch when columnFilters changes
      sortingModel, //refetch when sorting changes
    ],
    queryFn: ({ pageParam }) =>
      AnalysisService.sentenceAnnotationSearch({
        projectId: projectId!,
        requestBody: {
          filter: filter as MyFilter<SentAnnoColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as SentAnnoColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        page: pageParam as number,
        pageSize: fetchSize,
      }),
    initialPageParam: 0,
    enabled: !!projectId && !!userId,
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
  // scroll to top of table when sorting changes
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, sortingModel]);

  // table
  const table = useMaterialReactTable<SentenceAnnotationRow>({
    data: flatData,
    columns: columns,
    getRowId: (row) => `${row.id}`,
    // state
    state: {
      rowSelection: rowSelectionModel,
      sorting: sortingModel,
      columnVisibility: columnVisibilityModel,
      isLoading: isLoading || columns.length === 0,
      showAlertBanner: isError,
      showProgressBars: isFetching,
    },
    // selection
    enableRowSelection: true,
    onRowSelectionChange,
    // virtualization
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef: rowVirtualizerInstanceRef,
    rowVirtualizerOptions: { overscan: 4 },
    // filtering
    manualFiltering: true,
    enableColumnFilters: false,
    // pagination
    enablePagination: false,
    // sorting
    manualSorting: true,
    onSortingChange,
    // column visiblility
    onColumnVisibilityChange,
    // mui components
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef, //get access to the table container element
      onScroll: (event) => fetchMoreOnScroll(event.target as HTMLDivElement), //add an event listener to the table container element
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
            filterName,
            anchor: tableContainerRef,
            selectedAnnotations: flatData.filter((row) => rowSelectionModel[row.id]),
          })
      : undefined,
    renderToolbarInternalActions: (props) =>
      renderToolbarInternalActions({
        table: props.table,
        filterName,
        anchor: tableContainerRef,
        selectedAnnotations: flatData.filter((row) => rowSelectionModel[row.id]),
      }),
    renderBottomToolbarCustomActions: (props) => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <Typography>
          Fetched {totalFetched} of {totalResults} total rows.
        </Typography>
        {renderBottomToolbarCustomActions &&
          renderBottomToolbarCustomActions({
            table: props.table,
            filterName,
            anchor: tableContainerRef,
            selectedAnnotations: flatData.filter((row) => rowSelectionModel[row.id]),
          })}
      </Stack>
    ),
  });

  return (
    <Card className="myFlexContainer" {...cardProps}>
      <CardHeader title={title} />
      <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
        <MaterialReactTable table={table} />
      </CardContent>
    </Card>
  );
}

export default SentenceAnnotationTable;
