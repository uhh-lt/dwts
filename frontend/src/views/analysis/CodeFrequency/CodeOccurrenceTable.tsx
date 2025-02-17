import { Card, CardContent, CardHeader } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleGlobalFilterButton,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import React, { useRef } from "react";
import AnalysisHooks from "../../../api/CodeFrequencyHooks.ts";
import CodeHooks from "../../../api/CodeHooks.ts";
import { CodeOccurrence } from "../../../api/openapi/models/CodeOccurrence.ts";
import SdocRenderer from "../../../components/SourceDocument/SdocRenderer.tsx";
import UserName from "../../../components/User/UserName.tsx";
import { docTypeToIcon } from "../../../utils/docTypeToIcon.tsx";

const columns: MRT_ColumnDef<CodeOccurrence>[] = [
  {
    header: "Type",
    id: "type",
    accessorFn: (params) => params.sdoc.doctype,
    Cell: ({ row }) => docTypeToIcon[row.original.sdoc.doctype],
  },
  {
    header: "Document",
    id: "document",
    accessorFn: (params) => params.sdoc.filename,
    Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc} link renderFilename />,
  },
  {
    header: "Code",
    id: "code",
    accessorFn: (params) => params.code.name,
  },
  {
    header: "Text",
    accessorKey: "text",
  },
  {
    header: "Count",
    accessorKey: "count",
  },
];

interface CodeOccurrenceTableProps {
  projectId: number;
  codeId: number;
  userIds: number[];
}

function CodeOccurrenceTable({ projectId, codeId, userIds }: CodeOccurrenceTableProps) {
  // global server state (react-query)
  const code = CodeHooks.useGetCode(codeId);

  // computed
  const codeOccurrences = AnalysisHooks.useCodeOccurrences(projectId, userIds, codeId);

  // virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table
  const table = useMaterialReactTable<CodeOccurrence>({
    data: codeOccurrences.data || [],
    columns: columns,
    getRowId: (row) => `sdoc-${row?.sdoc?.id}-code-${row?.code?.id}-${row?.text}`,
    // state
    state: {
      isLoading: codeOccurrences.isLoading,
      showAlertBanner: codeOccurrences.isError,
      showProgressBars: codeOccurrences.isFetching,
    },
    // selection
    enableRowSelection: false,
    // pagination
    enablePagination: false,
    // virtualization
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef: rowVirtualizerInstanceRef,
    rowVirtualizerOptions: { overscan: 2 },
    // toolbars
    enableBottomToolbar: false,
    renderToolbarInternalActions: ({ table }) => (
      <>
        <MRT_ToggleGlobalFilterButton table={table} />
        <MRT_ToggleFiltersButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </>
    ),
    // mui components
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef, //get access to the table container element
      style: { flexGrow: 1 },
    },
    muiToolbarAlertBannerProps: codeOccurrences.isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
  });

  return (
    <Card className="h100 myFlexContainer" variant="outlined">
      <CardHeader
        className="myFlexFitContentContainer"
        title={`Occurrences of code '${code.data?.name || ""}'`}
        subheader={
          <>
            annotated by{" "}
            {userIds.map((userId, index) => (
              <React.Fragment key={userId}>
                <UserName userId={userId} />
                {index < userIds.length - 1 ? ", " : ""}
              </React.Fragment>
            ))}
          </>
        }
      />
      <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
        <MaterialReactTable table={table} />
      </CardContent>
    </Card>
  );
}

export default CodeOccurrenceTable;
