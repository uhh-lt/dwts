import StyleIcon from "@mui/icons-material/Style";
import { Box, Button, ButtonProps, Dialog, DialogTitle, Stack, Tooltip } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useState } from "react";
import { XYPosition } from "reactflow";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import TagTable from "../../../components/Tag/TagTable.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createTagNodes } from "../whiteboardUtils.ts";

export interface AddTagNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddTagNodeDialog({ projectId, buttonProps, onClick }: AddTagNodeDialogProps) {
  // local state
  const [open, setOpen] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  const handleOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setRowSelectionModel({});
  };

  const handleConfirmSelection = (tags: DocumentTagRead[]) => {
    const addTagNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createTagNodes({ tags, position: position }));
    onClick(addTagNode);
    handleClose();
  };

  return (
    <>
      <Button onClick={handleOpenDialogClick} {...buttonProps}>
        <Tooltip title="Add Tags" placement="right" arrow>
          <StyleIcon />
        </Tooltip>
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select tags to add to Whiteboard</DialogTitle>
        <TagTable
          projectId={projectId}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={setRowSelectionModel}
          renderBottomToolbarCustomActions={(props) => (
            <Stack direction={"row"} spacing={1} alignItems="center" p={1}>
              <Box flexGrow={1} />
              <Button onClick={handleClose}>Close</Button>
              <Button
                onClick={() => handleConfirmSelection(props.selectedTags)}
                disabled={props.selectedTags.length === 0}
              >
                Add {props.selectedTags.length > 0 ? props.selectedTags.length : null} Tags
              </Button>
            </Stack>
          )}
        />
      </Dialog>
    </>
  );
}

export default AddTagNodeDialog;
