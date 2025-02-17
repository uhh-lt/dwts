import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_TableInstance,
  MRT_TableOptions,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo } from "react";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";

import SquareIcon from "@mui/icons-material/Square";
import CodeHooks from "../../api/CodeHooks.ts";

const createDataTree = (dataset: CodeRead[]): CodeTableRow[] => {
  const hashTable: Record<number, CodeTableRow> = Object.create(null);
  dataset.forEach((data) => (hashTable[data.id] = { ...data, subRows: [] }));

  const dataTree: CodeTableRow[] = [];
  dataset.forEach((data) => {
    if (data.parent_id) hashTable[data.parent_id].subRows.push(hashTable[data.id]);
    else dataTree.push(hashTable[data.id]);
  });
  return dataTree;
};

interface CodeTableRow extends CodeRead {
  subRows: CodeTableRow[];
}

const columns: MRT_ColumnDef<CodeTableRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "color",
    header: "Color",
    enableColumnFilter: false,
    Cell: ({ row }) => {
      return <SquareIcon style={{ color: row.original.color, blockSize: 24 }} />;
    },
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
];

export interface CodeTableActionProps {
  table: MRT_TableInstance<CodeTableRow>;
  selectedCodes: CodeRead[];
}

export interface CodeTableProps {
  projectId: number;
  // selection
  enableMultiRowSelection?: boolean;
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<CodeTableRow>["onRowSelectionChange"];
  // toolbar
  renderToolbarInternalActions?: (props: CodeTableActionProps) => React.ReactNode;
  renderTopToolbarCustomActions?: (props: CodeTableActionProps) => React.ReactNode;
  renderBottomToolbarCustomActions?: (props: CodeTableActionProps) => React.ReactNode;
}

function CodeTable({
  enableMultiRowSelection = true,
  rowSelectionModel,
  onRowSelectionChange,
  renderToolbarInternalActions,
  renderTopToolbarCustomActions,
  renderBottomToolbarCustomActions,
}: CodeTableProps) {
  // global server state
  const projectCodes = CodeHooks.useGetEnabledCodes();

  // computed
  const { projectCodesMap, projectCodesRows } = useMemo(() => {
    // we have to transform the data, better do this elsewhere?
    if (!projectCodes.data) return { projectCodesMap: {}, projectCodesRows: [] };

    const projectCodesMap = projectCodes.data.reduce(
      (acc, projectCode) => {
        acc[projectCode.id.toString()] = projectCode;
        return acc;
      },
      {} as Record<string, CodeRead>,
    );

    const projectCodesRows = createDataTree(projectCodes.data);

    return { projectCodesMap, projectCodesRows };
  }, [projectCodes.data]);

  // table
  const table = useMaterialReactTable<CodeTableRow>({
    data: projectCodesRows,
    columns: columns,
    getRowId: (row) => `${row.id}`,
    // style
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      style: { flexGrow: 1 },
    },
    // state
    state: {
      rowSelection: rowSelectionModel,
      isLoading: projectCodes.isLoading,
      showAlertBanner: projectCodes.isError,
      showProgressBars: projectCodes.isFetching,
    },
    // handle error
    muiToolbarAlertBannerProps: projectCodes.isError
      ? {
          color: "error",
          children: projectCodes.error.message,
        }
      : undefined,
    // virtualization (scrolling instead of pagination)
    enablePagination: false,
    enableRowVirtualization: true,
    // selection
    enableRowSelection: true,
    enableMultiRowSelection: enableMultiRowSelection,
    onRowSelectionChange,
    // toolbar
    enableBottomToolbar: true,
    renderTopToolbarCustomActions: renderTopToolbarCustomActions
      ? (props) =>
          renderTopToolbarCustomActions({
            table: props.table,
            selectedCodes: Object.keys(rowSelectionModel).map((codeId) => projectCodesMap[codeId]),
          })
      : undefined,
    renderToolbarInternalActions: renderToolbarInternalActions
      ? (props) =>
          renderToolbarInternalActions({
            table: props.table,
            selectedCodes: Object.values(projectCodesMap).filter((row) => rowSelectionModel[row.id]),
          })
      : undefined,
    renderBottomToolbarCustomActions: renderBottomToolbarCustomActions
      ? (props) =>
          renderBottomToolbarCustomActions({
            table: props.table,
            selectedCodes: Object.values(projectCodesMap).filter((row) => rowSelectionModel[row.id]),
          })
      : undefined,
    // hide columns per default
    initialState: {
      columnVisibility: {
        id: false,
      },
    },
    // tree structure
    enableExpanding: true,
    getSubRows: (originalRow) => originalRow.subRows,
    filterFromLeafRows: true, //search for child rows and preserve parent rows
    enableSubRowSelection: false,
  });

  return <MaterialReactTable table={table} />;
}
export default CodeTable;
