import {
  LiteralUnion,
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_TableInstance,
  MRT_TableOptions,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo } from "react";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { EntityRead } from "../../../api/openapi/models/EntityRead.ts";
import { SpanTextRead } from "../../../api/openapi/models/SpanTextRead.ts";

export interface EnitityTableRow extends EntityRead {
  table_id: string;
  subRows: SpanTextTableRow[];
  editable: boolean;
}

export interface SpanTextTableRow extends SpanTextRead {
  table_id: string;
  subRows: SpanTextTableRow[];
  editable: boolean;
}

const columns: MRT_ColumnDef<EnitityTableRow | SpanTextTableRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
    enableEditing: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    enableEditing: true,
  },
  {
    accessorKey: "knowledge_base_id",
    header: "Knowledge Base ID",
    enableEditing: true,
  },
  {
    accessorKey: "is_human",
    header: "Is Human",
    enableEditing: false,
    Cell: ({ cell }) => {
      return cell.getValue() ? "True" : "False";
    },
  },
];

export interface EntityTableActionProps {
  table: MRT_TableInstance<EnitityTableRow | SpanTextTableRow>;
  selectedSpanTexts: SpanTextRead[];
}

export interface EntityTableSaveRowProps extends EntityTableActionProps {
  values: Record<LiteralUnion<"id" | "name" | "knowledge_base_id", string>, string>;
}

export interface EntityTableProps {
  projectId: number;
  // selection
  enableMultiRowSelection?: boolean;
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<EnitityTableRow>["onRowSelectionChange"];
  // toolbar
  renderToolbarInternalActions?: (props: EntityTableActionProps) => React.ReactNode;
  renderTopToolbarCustomActions?: (props: EntityTableActionProps) => React.ReactNode;
  renderBottomToolbarCustomActions?: (props: EntityTableActionProps) => React.ReactNode;
  // editing
  onSaveEditRow: MRT_TableOptions<EnitityTableRow | SpanTextTableRow>["onEditingRowSave"];
  onCreateSaveRow: (props: EntityTableSaveRowProps) => void;
}

function EntityTable({
  projectId,
  enableMultiRowSelection = true,
  rowSelectionModel,
  onRowSelectionChange,
  renderToolbarInternalActions,
  renderTopToolbarCustomActions,
  renderBottomToolbarCustomActions,
  onSaveEditRow,
  onCreateSaveRow,
}: EntityTableProps) {
  // global server state
  const projectEntities = ProjectHooks.useGetAllEntities(projectId);

  // computed
  const { projectEntitiesRows, projectSpanTextMap } = useMemo(() => {
    if (!projectEntities.data) {
      return {
        projectEntitiesMap: {} as Record<string, EntityRead>,
        projectEntitiesRows: [],
        projectSpanTextMap: {} as Record<string, SpanTextRead>,
      };
    }

    const projectEntitiesRows: EnitityTableRow[] = projectEntities.data.map((entity) => {
      const subRows: SpanTextTableRow[] =
        entity.span_texts?.map((span) => ({
          ...span,
          table_id: `S-${span.id}`,
          name: span.text,
          subRows: [],
          editable: false,
        })) || [];
      const table_id = `E-${entity.id}`;
      const editable = true;
      return { table_id, ...entity, subRows, editable };
    });

    const projectSpanTextMap = projectEntities.data.reduce(
      (acc, entity) => {
        if (Array.isArray(entity.span_texts)) {
          entity.span_texts.forEach((span) => {
            acc[`S-${span.id}`] = span;
          });
        }
        return acc;
      },
      {} as Record<string, SpanTextRead>,
    );

    return { projectEntitiesRows, projectSpanTextMap };
  }, [projectEntities.data]);

  // table
  const table = useMaterialReactTable<EnitityTableRow | SpanTextTableRow>({
    data: projectEntitiesRows,
    columns: columns,
    getRowId: (row) => `${row.table_id}`,
    enableEditing: (row) => {
      return row.original.editable;
    },
    createDisplayMode: "modal",
    editDisplayMode: "row",
    onEditingRowSave: onSaveEditRow,
    onCreatingRowSave: (props) => {
      const selectedSpanTexts = Object.keys(props.table.getState().rowSelection)
        .filter((id) => id.startsWith("S-"))
        .map((spanTextId) => projectSpanTextMap[spanTextId]);

      const allSpanTexts = [...selectedSpanTexts];

      onCreateSaveRow({
        selectedSpanTexts: allSpanTexts,
        values: props.values,
        table: props.table,
      });
    },
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
      isLoading: projectEntities.isLoading,
      showAlertBanner: projectEntities.isError,
      showProgressBars: projectEntities.isFetching,
    },
    // handle error
    muiToolbarAlertBannerProps: projectEntities.isError
      ? {
          color: "error",
          children: projectEntities.error.message,
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
            selectedSpanTexts: Object.keys(rowSelectionModel)
              .filter((id) => id.startsWith("S-"))
              .map((spanTextId) => projectSpanTextMap[spanTextId]),
          })
      : undefined,
    renderToolbarInternalActions: renderToolbarInternalActions
      ? (props) =>
          renderToolbarInternalActions({
            table: props.table,
            selectedSpanTexts: Object.keys(rowSelectionModel)
              .filter((id) => id.startsWith("S-"))
              .map((spanTextId) => projectSpanTextMap[spanTextId]),
          })
      : undefined,
    renderBottomToolbarCustomActions: renderBottomToolbarCustomActions
      ? (props) =>
          renderBottomToolbarCustomActions({
            table: props.table,
            selectedSpanTexts: Object.keys(rowSelectionModel)
              .filter((id) => id.startsWith("S-"))
              .map((spanTextId) => projectSpanTextMap[spanTextId]),
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
    enableSubRowSelection: true,
  });

  return <MaterialReactTable table={table} />;
}
export default EntityTable;
