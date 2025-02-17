import { Box, Button, ButtonProps, CircularProgress, Dialog } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useState } from "react";
import { XYPosition } from "reactflow";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import SpanAnnotationTable from "../../../components/SpanAnnotation/SpanAnnotationTable/SpanAnnotationTable.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createSpanAnnotationNodes } from "../whiteboardUtils.ts";

const filterName = "spanAnnotationDialogWhiteboard";

interface AddSpanAnnotationNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddSpanAnnotationNodeDialog({ projectId, buttonProps, ...props }: AddSpanAnnotationNodeDialogProps) {
  // local state
  const [open, setOpen] = useState(false);

  // global server state
  const metadata = MetadataHooks.useGetProjectMetadataList();

  // actions
  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button onClick={handleOpen} {...buttonProps}>
        Add annotations
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth PaperProps={{ style: { height: "100%" } }}>
        {metadata.isSuccess ? (
          <AddSpanAnnotationNodeDialogContent
            onClose={handleClose}
            projectId={projectId}
            metadata={metadata.data}
            {...props}
          />
        ) : metadata.isLoading ? (
          <CircularProgress />
        ) : (
          <div>An error occured</div>
        )}
      </Dialog>
    </>
  );
}

function AddSpanAnnotationNodeDialogContent({
  metadata,
  projectId,
  onClick,
  onClose,
}: AddSpanAnnotationNodeDialogProps & { onClose: () => void; metadata: ProjectMetadataRead[] }) {
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const [visibilityModel, setVisibilityModel] = useState<MRT_VisibilityState>(() =>
    // init visibility (disable metadata)
    metadata.reduce((acc, curr) => {
      return {
        ...acc,
        [curr.id]: false,
      };
    }, {}),
  );
  const selectedAnnotationIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  // actions
  const handleClose = () => {
    onClose();
    setRowSelectionModel({});
  };

  const handleConfirmSelection = () => {
    const spanAnnotations = selectedAnnotationIds;
    const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createSpanAnnotationNodes({ spanAnnotations, position }));
    onClick(addNode);
    handleClose();
  };

  return (
    <SpanAnnotationTable
      title="Select span annotations to add to Whiteboard"
      projectId={projectId}
      filterName={filterName}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={visibilityModel}
      onColumnVisibilityChange={setVisibilityModel as React.Dispatch<React.SetStateAction<MRT_VisibilityState>>}
      cardProps={{ elevation: 2, className: "myFlexFillAllContainer myFlexContainer" }}
      renderBottomToolbarCustomActions={(props) => (
        <>
          <Box flexGrow={1} />
          <Button onClick={handleClose}>Close</Button>
          <Button onClick={handleConfirmSelection} disabled={props.selectedAnnotations.length === 0}>
            Add {props.selectedAnnotations.length > 0 ? props.selectedAnnotations.length : null} Annotations
          </Button>
        </>
      )}
    />
  );
}

export default AddSpanAnnotationNodeDialog;
