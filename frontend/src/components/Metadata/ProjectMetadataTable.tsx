import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_TableInstance,
  MRT_TableOptions,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo } from "react";
import MetadataHooks from "../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../api/openapi/models/ProjectMetadataRead.ts";

const columns: MRT_ColumnDef<ProjectMetadataRead>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "key",
    header: "Metadata",
  },
  {
    accessorKey: "metatype",
    header: "Type",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
];

export interface ProjectMetadataTableActionProps {
  table: MRT_TableInstance<ProjectMetadataRead>;
  selectedProjectMetadata: ProjectMetadataRead[];
}

interface SharedProjectMetadataTableProps {
  // selection
  enableMultiRowSelection?: boolean;
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<ProjectMetadataRead>["onRowSelectionChange"];
  // toolbar
  renderToolbarInternalActions?: (props: ProjectMetadataTableActionProps) => React.ReactNode;
  renderTopToolbarCustomActions?: (props: ProjectMetadataTableActionProps) => React.ReactNode;
  renderBottomToolbarCustomActions?: (props: ProjectMetadataTableActionProps) => React.ReactNode;
}

interface ProjectMetadataTableProps extends SharedProjectMetadataTableProps {
  projectMetadata?: ProjectMetadataRead[];
}

function ProjectMetadataTable(props: ProjectMetadataTableProps) {
  const projectMetadata = props.projectMetadata;
  if (projectMetadata) {
    return <ProjectMetadataTableContent projectMetadata={projectMetadata} {...props} />;
  } else {
    return <ProjectMetadataTableWithoutMetadata {...props} />;
  }
}

function ProjectMetadataTableWithoutMetadata(props: SharedProjectMetadataTableProps) {
  // global server state
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();

  if (projectMetadata.isSuccess) {
    return <ProjectMetadataTableContent {...props} projectMetadata={projectMetadata.data} />;
  } else {
    return null;
  }
}

interface ProjectMetadataTableContentProps extends SharedProjectMetadataTableProps {
  projectMetadata: ProjectMetadataRead[];
}

function ProjectMetadataTableContent({
  projectMetadata,
  enableMultiRowSelection = true,
  rowSelectionModel,
  onRowSelectionChange,
  renderToolbarInternalActions,
  renderTopToolbarCustomActions,
  renderBottomToolbarCustomActions,
}: ProjectMetadataTableContentProps) {
  // computed
  const projectMetadataMap = useMemo(() => {
    const projectMetadataMap = projectMetadata.reduce(
      (acc, projectMetadata) => {
        acc[projectMetadata.id.toString()] = projectMetadata;
        return acc;
      },
      {} as Record<string, ProjectMetadataRead>,
    );

    return projectMetadataMap;
  }, [projectMetadata]);

  // table
  const table = useMaterialReactTable<ProjectMetadataRead>({
    data: projectMetadata,
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
    },
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
            selectedProjectMetadata: Object.keys(rowSelectionModel).map((mId) => projectMetadataMap[mId]),
          })
      : undefined,
    renderToolbarInternalActions: renderToolbarInternalActions
      ? (props) =>
          renderToolbarInternalActions({
            table: props.table,
            selectedProjectMetadata: Object.values(projectMetadataMap).filter((row) => rowSelectionModel[row.id]),
          })
      : undefined,
    renderBottomToolbarCustomActions: renderBottomToolbarCustomActions
      ? (props) =>
          renderBottomToolbarCustomActions({
            table: props.table,
            selectedProjectMetadata: Object.values(projectMetadataMap).filter((row) => rowSelectionModel[row.id]),
          })
      : undefined,
    // hide columns per default
    initialState: {
      columnVisibility: {
        id: false,
      },
    },
  });

  return <MaterialReactTable table={table} />;
}
export default ProjectMetadataTable;
