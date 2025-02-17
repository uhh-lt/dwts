import { Box, Button, ButtonProps, CircularProgress, Dialog } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState, MRT_VisibilityState } from "material-react-table";
import { useState } from "react";
import { XYPosition } from "reactflow";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import MemoTable from "../../../components/Memo/MemoTable/MemoTable.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createMemoNodes } from "../whiteboardUtils.ts";

const filterName = "memoDialogWhiteboard";

export interface AddMemoNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddMemoNodeDialog({ projectId, buttonProps, ...props }: AddMemoNodeDialogProps) {
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
        Add memos
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth PaperProps={{ style: { height: "100%" } }}>
        {metadata.isSuccess ? (
          <AddMemoNodeDialogContent onClose={handleClose} projectId={projectId} metadata={metadata.data} {...props} />
        ) : metadata.isLoading ? (
          <CircularProgress />
        ) : (
          <div>An error occurred</div>
        )}
      </Dialog>
    </>
  );
}

function AddMemoNodeDialogContent({
  metadata,
  projectId,
  onClick,
  onClose,
}: AddMemoNodeDialogProps & { onClose: () => void; metadata: ProjectMetadataRead[] }) {
  // local state
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
  const selectedMemoIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  // actions
  const handleClose = () => {
    onClose();
    setRowSelectionModel({});
  };

  const handleConfirmSelection = () => {
    const memos = selectedMemoIds;
    const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createMemoNodes({ memos, position }));
    onClick(addNode);
    handleClose();
  };

  return (
    <MemoTable
      title="Select memos to add to Whiteboard"
      projectId={projectId}
      filterName={filterName}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={visibilityModel}
      onColumnVisibilityChange={setVisibilityModel}
      cardProps={{ elevation: 2, className: "myFlexFillAllContainer myFlexContainer" }}
      renderBottomToolbarCustomActions={(props) => (
        <>
          <Box flexGrow={1} />
          <Button onClick={handleClose}>Close</Button>
          <Button onClick={handleConfirmSelection} disabled={props.selectedMemos.length === 0}>
            Add {props.selectedMemos.length > 0 ? props.selectedMemos.length : null} Memos
          </Button>
        </>
      )}
    />
  );
}

export default AddMemoNodeDialog;
