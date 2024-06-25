import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_TableInstance,
  MRT_TableOptions,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo } from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { EntityRead } from "../../api/openapi/models/EntityRead.ts";
import { SpanTextRead } from "../../api/openapi/models/SpanTextRead.ts";

interface EnitityTableRow{
  id: string,
  original: EntityRead,
  subRows: SpanTextTableRow[];
  editable: boolean;
}

interface SpanTextTableRow{
  id: string,
  original: SpanTextRead,
  subRows: SpanTextTableRow[];
  editable: boolean;
}

const columns: MRT_ColumnDef<EnitityTableRow|SpanTextTableRow>[] = [
  {
    accessorKey: "original.id",
    header: "ID",
    enableEditing: false,
  },
  {
    accessorKey: 'original.name',
    header: 'Name',
    enableEditing: true,
  },
];

export interface EntityTableActionProps {
  table: MRT_TableInstance<EnitityTableRow | SpanTextTableRow>;
  selectedEntities: EntityRead[];
  selectedSpanTexts: SpanTextRead[];
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
  onSaveEditRow: MRT_TableOptions<EnitityTableRow | SpanTextTableRow>['onEditingRowSave'];
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
}: EntityTableProps) {
  // global server state
  const projectEntities = ProjectHooks.useGetAllEntities(projectId);

  // computed
  const { projectEntitiesMap, projectEntitiesRows, projectSpanTextMap } = useMemo(() => {
    if (!projectEntities.data) return { projectEntitiesMap: {} as Record<string, EntityRead>, projectEntitiesRows: [], projectSpanTextMap: {} as Record<string, SpanTextRead>};
  
    const projectEntitiesMap = projectEntities.data.reduce(
      (entity_map, projectEntity) => {
        const id = `E-${projectEntity.id}`;
        entity_map[id] = projectEntity;
        return entity_map;
      },
      {} as Record<string, EntityRead>,
    );
    const projectEntitiesRows = projectEntities.data.map(entity => {
      const subRows = entity.span_texts?.map(span => ({
        id: `S-${span.id}`,
        original: {...span, name: span.text},
        subRows: [],
        editable: false,
      })) || [];
      const original = entity;
      const id = `E-${entity.id}`;
      const editable = true;
      return { id, original, subRows, editable };
    });

    const projectSpanTextMap = projectEntities.data.reduce((acc, entity) => {
      if (Array.isArray(entity.span_texts)) {
        entity.span_texts.forEach(span => {
          acc[`S-${span.id}`] = span;
        });
      }
      return acc;
    }, {} as Record<string, SpanTextRead>)
  
    return { projectEntitiesMap, projectEntitiesRows, projectSpanTextMap};
  }, [projectEntities.data]);

  // table
  const table = useMaterialReactTable<EnitityTableRow|SpanTextTableRow>({
    data: projectEntitiesRows,
    columns: columns,
    getRowId: (row) => `${row.id}`,
    enableEditing: (row) => {return row.original.editable},
    editDisplayMode: 'row',
    onEditingRowSave: onSaveEditRow,
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
            selectedEntities: Object.keys(rowSelectionModel).filter(id => id.startsWith('E-')).map((entityId) => projectEntitiesMap[entityId]),
            selectedSpanTexts: Object.keys(rowSelectionModel).filter(id => id.startsWith('S-')).map((spanTextId) => projectSpanTextMap[spanTextId]),
          })
      : undefined,
    renderToolbarInternalActions: renderToolbarInternalActions
      ? (props) =>
          renderToolbarInternalActions({
            table: props.table,
            selectedEntities: Object.keys(rowSelectionModel).filter(id => id.startsWith('E-')).map((entityId) => projectEntitiesMap[entityId]),
            selectedSpanTexts: Object.keys(rowSelectionModel).filter(id => id.startsWith('S-')).map((spanTextId) => projectSpanTextMap[spanTextId]),
          })
      : undefined,
    renderBottomToolbarCustomActions: renderBottomToolbarCustomActions
      ? (props) =>
          renderBottomToolbarCustomActions({
            table: props.table,
            selectedEntities: Object.keys(rowSelectionModel).filter(id => id.startsWith('E-')).map((entityId) => projectEntitiesMap[entityId]),
            selectedSpanTexts: Object.keys(rowSelectionModel).filter(id => id.startsWith('S-')).map((spanTextId) => projectSpanTextMap[spanTextId]),
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
export default EntityTable;
