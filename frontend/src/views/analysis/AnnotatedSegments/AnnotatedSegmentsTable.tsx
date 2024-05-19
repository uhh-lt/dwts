import { useParams } from "react-router-dom";
import SpanAnnotationTable, {
  SpanAnnotationTableProps,
} from "../../../components/SpanAnnotationTable/SpanAnnotationTable.tsx";
import { useReduxConnector } from "../../../components/SpanAnnotationTable/useReduxConnector.ts";
import AnnotatedSegmentsTableToolbar from "./AnnotatedSegmentsTableToolbar.tsx";
import BulkChangeCodeButton from "./BulkChangeCodeButton.tsx";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice.ts";

const filterName = "annotatedSegments";
interface AnnotatedSegmentsTableProps {
  cardProps: SpanAnnotationTableProps["cardProps"];
  onRowContextMenu: SpanAnnotationTableProps["onRowContextMenu"];
}

function AnnotatedSegmentsTable({ cardProps, onRowContextMenu }: AnnotatedSegmentsTableProps) {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.annotatedSegments.rowSelectionModel,
    AnnotatedSegmentsActions.onSelectionModelChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.annotatedSegments.sortModel,
    AnnotatedSegmentsActions.onSortModelChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.annotatedSegments.columnVisibilityModel,
    AnnotatedSegmentsActions.onColumnVisibilityChange,
  );

  return (
    <SpanAnnotationTable
      projectId={projectId}
      filterName={filterName}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={setColumnVisibilityModel}
      onRowContextMenu={onRowContextMenu}
      renderTopToolbarCustomActions={(props) => <BulkChangeCodeButton {...props} filterName={filterName} />}
      renderToolbarInternalActions={AnnotatedSegmentsTableToolbar}
      cardProps={cardProps}
      positionToolbarAlertBanner="head-overlay"
    />
  );
}

export default AnnotatedSegmentsTable;
