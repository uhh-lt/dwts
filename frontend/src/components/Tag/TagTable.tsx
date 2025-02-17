import LabelIcon from "@mui/icons-material/Label";
import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_TableInstance,
  MRT_TableOptions,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo } from "react";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import TagHooks from "../../api/TagHooks.ts";

const createDataTree = (dataset: DocumentTagRead[]): TagTableRow[] => {
  const hashTable: Record<number, TagTableRow> = Object.create(null);
  dataset.forEach((data) => (hashTable[data.id] = { ...data, subRows: [] }));

  const dataTree: TagTableRow[] = [];
  dataset.forEach((data) => {
    if (data.parent_id) hashTable[data.parent_id].subRows.push(hashTable[data.id]);
    else dataTree.push(hashTable[data.id]);
  });
  return dataTree;
};

interface TagTableRow extends DocumentTagRead {
  subRows: TagTableRow[];
}

const columns: MRT_ColumnDef<TagTableRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "color",
    header: "Color",
    enableColumnFilter: false,
    Cell: ({ row }) => {
      return <LabelIcon style={{ color: row.original.color, blockSize: 24 }} />;
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
  table: MRT_TableInstance<TagTableRow>;
  selectedTags: DocumentTagRead[];
}

interface TagTableProps {
  projectId: number;
  // selection
  enableMultiRowSelection?: boolean;
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<TagTableRow>["onRowSelectionChange"];
  // toolbar
  renderToolbarInternalActions?: (props: CodeTableActionProps) => React.ReactNode;
  renderTopToolbarCustomActions?: (props: CodeTableActionProps) => React.ReactNode;
  renderBottomToolbarCustomActions?: (props: CodeTableActionProps) => React.ReactNode;
}

function TagTable({
  enableMultiRowSelection = true,
  rowSelectionModel,
  onRowSelectionChange,
  renderToolbarInternalActions,
  renderTopToolbarCustomActions,
  renderBottomToolbarCustomActions,
}: TagTableProps) {
  // global server state
  const projectTags = TagHooks.useGetAllTags();

  // computed
  const { projectTagsMap, projectTagRows } = useMemo(() => {
    // we have to transform the data, better do this elsewhere?
    if (!projectTags.data) return { projectTagsMap: {}, projectTagRows: [] };

    const projectTagsMap = projectTags.data.reduce(
      (acc, projectTag) => {
        acc[projectTag.id.toString()] = projectTag;
        return acc;
      },
      {} as Record<string, DocumentTagRead>,
    );

    const projectTagRows = createDataTree(projectTags.data);

    return { projectTagsMap, projectTagRows };
  }, [projectTags.data]);

  // table
  const table = useMaterialReactTable<TagTableRow>({
    data: projectTagRows,
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
      isLoading: projectTags.isLoading,
      showAlertBanner: projectTags.isError,
      showProgressBars: projectTags.isFetching,
    },
    // handle error
    muiToolbarAlertBannerProps: projectTags.isError
      ? {
          color: "error",
          children: projectTags.error.message,
        }
      : undefined,
    // virtualization (scrolling instead of pagination)
    enablePagination: false,
    enableRowVirtualization: true,
    // selection
    enableRowSelection: true,
    enableMultiRowSelection,
    onRowSelectionChange,
    // toolbar
    enableBottomToolbar: true,
    renderTopToolbarCustomActions: renderTopToolbarCustomActions
      ? (props) =>
          renderTopToolbarCustomActions({
            table: props.table,
            selectedTags: Object.keys(rowSelectionModel).map((tagId) => projectTagsMap[tagId]),
          })
      : undefined,
    renderToolbarInternalActions: renderToolbarInternalActions
      ? (props) =>
          renderToolbarInternalActions({
            table: props.table,
            selectedTags: Object.values(projectTagsMap).filter((row) => rowSelectionModel[row.id]),
          })
      : undefined,
    renderBottomToolbarCustomActions: renderBottomToolbarCustomActions
      ? (props) =>
          renderBottomToolbarCustomActions({
            table: props.table,
            selectedTags: Object.values(projectTagsMap).filter((row) => rowSelectionModel[row.id]),
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
export default TagTable;
