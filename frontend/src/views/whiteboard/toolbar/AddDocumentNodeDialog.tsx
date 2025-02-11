import NoteAddIcon from "@mui/icons-material/NoteAdd";
import { Box, Button, ButtonProps, Dialog, DialogTitle, Tooltip } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState } from "material-react-table";
import { useState } from "react";
import { XYPosition } from "reactflow";
import SdocTable from "../../../components/SourceDocument/SdocTable/SdocTable.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createSdocNodes } from "../whiteboardUtils.ts";

const filterName = "documentDialogWhiteboard";

export interface AddDocumentNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddDocumentNodeDialog({ projectId, buttonProps, onClick }: AddDocumentNodeDialogProps) {
  // local state
  const [open, setOpen] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const selectedSdocIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  const handleOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setRowSelectionModel({});
  };

  const handleConfirmSelection = () => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createSdocNodes({ sdocs: selectedSdocIds, position: position }));
    onClick(addNode);
    handleClose();
  };

  return (
    <>
      <Button onClick={handleOpenDialogClick} {...buttonProps}>
        <Tooltip title="Add Documents" placement="right" arrow>
          <NoteAddIcon />
        </Tooltip>
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select documents to add to Whiteboard</DialogTitle>
        <SdocTable
          projectId={projectId}
          filterName={filterName}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={setRowSelectionModel}
          sortingModel={sortingModel}
          onSortingChange={setSortingModel}
          renderBottomToolbarCustomActions={(props) => (
            <>
              <Box flexGrow={1} />
              <Button onClick={handleClose}>Close</Button>
              <Button onClick={handleConfirmSelection} disabled={props.selectedDocuments.length === 0}>
                Add {props.selectedDocuments.length > 0 ? props.selectedDocuments.length : null} Documents
              </Button>
            </>
          )}
        />
      </Dialog>
    </>
  );
}

export default AddDocumentNodeDialog;
