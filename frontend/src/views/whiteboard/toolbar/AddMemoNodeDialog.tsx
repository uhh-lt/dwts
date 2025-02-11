import DescriptionIcon from "@mui/icons-material/Description";
import { Box, Button, ButtonProps, Dialog, DialogTitle, Stack, Tooltip } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useState } from "react";
import { XYPosition } from "reactflow";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import MemoTable from "../../../components/Memo/MemoTable.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createMemoNodes } from "../whiteboardUtils.ts";

export interface AddMemoNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddMemoNodeDialog({ projectId, buttonProps, onClick }: AddMemoNodeDialogProps) {
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

  const handleConfirmSelection = (memos: MemoRead[]) => {
    const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createMemoNodes({ memos, position: position }));
    onClick(addNode);
    handleClose();
  };

  return (
    <>
      <Button onClick={handleOpenDialogClick} {...buttonProps}>
        <Tooltip title="Add Memos" placement="right" arrow>
          <DescriptionIcon />
        </Tooltip>
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select memos to add to Whiteboard</DialogTitle>
        <MemoTable
          projectId={projectId}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={setRowSelectionModel}
          renderBottomToolbarCustomActions={(props) => (
            <Stack direction={"row"} spacing={1} alignItems="center" p={1}>
              <Box flexGrow={1} />
              <Button onClick={handleClose}>Close</Button>
              <Button
                onClick={() => handleConfirmSelection(props.selectedMemos)}
                disabled={props.selectedMemos.length === 0}
              >
                Add {props.selectedMemos.length > 0 ? props.selectedMemos.length : null} Memos
              </Button>
            </Stack>
          )}
        />
      </Dialog>
    </>
  );
}

export default AddMemoNodeDialog;
