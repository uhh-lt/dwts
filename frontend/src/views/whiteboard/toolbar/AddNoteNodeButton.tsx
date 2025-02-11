import EditNoteIcon from "@mui/icons-material/EditNote";
import { Button, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { XYPosition } from "reactflow";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createNoteNode } from "../whiteboardUtils.ts";

function AddNoteNodeButton({ onClick, buttonProps }: AddNodeDialogProps) {
  const handleAddNoteNode = useCallback(() => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes([createNoteNode({ position: position })]);
    onClick(addNode);
  }, [onClick]);

  return (
    <Button onClick={handleAddNoteNode} {...buttonProps}>
      <Tooltip title="Add Note" arrow placement="right">
        <EditNoteIcon />
      </Tooltip>
    </Button>
  );
}

export default AddNoteNodeButton;
