import CodeIcon from "@mui/icons-material/Code";
import { Box, Button, ButtonProps, Dialog, DialogTitle, Stack, Tooltip } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useState } from "react";
import { XYPosition } from "reactflow";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import CodeTable from "../../../components/Code/CodeTable.tsx";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { PendingAddNodeAction } from "../types/PendingAddNodeAction.ts";
import { createCodeNodes } from "../whiteboardUtils.ts";

export interface AddCodeNodeDialogProps extends AddNodeDialogProps {
  projectId: number;
  buttonProps?: Omit<ButtonProps, "onClick">;
}

function AddCodeNodeDialog({ projectId, buttonProps, onClick }: AddCodeNodeDialogProps) {
  // local state
  const [open, setOpen] = useState(false);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  const onOpenDialogClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setRowSelectionModel({});
  };

  const handleConfirmSelection = (codes: CodeRead[]) => {
    const addNode: PendingAddNodeAction = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes(createCodeNodes({ codes, position: position }));
    onClick(addNode);
    handleClose();
  };

  return (
    <>
      <Button onClick={onOpenDialogClick} {...buttonProps}>
        <Tooltip title="Add Code" placement="right" arrow>
          <CodeIcon />
        </Tooltip>
      </Button>
      <Dialog onClose={handleClose} open={open} maxWidth="lg" fullWidth>
        <DialogTitle>Select codes to add to Whiteboard</DialogTitle>
        <CodeTable
          projectId={projectId}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionChange={setRowSelectionModel}
          renderBottomToolbarCustomActions={(props) => (
            <Stack direction={"row"} spacing={1} alignItems="center" p={1}>
              <Box flexGrow={1} />
              <Button onClick={handleClose}>Close</Button>
              <Button
                onClick={() => handleConfirmSelection(props.selectedCodes)}
                disabled={props.selectedCodes.length === 0}
              >
                Add {props.selectedCodes.length > 0 ? props.selectedCodes.length : null} Codes
              </Button>
            </Stack>
          )}
        />
      </Dialog>
    </>
  );
}

export default AddCodeNodeDialog;
