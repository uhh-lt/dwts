import TextFieldsIcon from "@mui/icons-material/TextFields";
import { Button, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { XYPosition } from "reactflow";
import { ReactFlowService } from "../hooks/ReactFlowService.ts";
import { AddNodeDialogProps } from "../types/AddNodeDialogProps.ts";
import { createTextNode } from "../whiteboardUtils.ts";

function AddTextNodeButton({ onClick, buttonProps }: AddNodeDialogProps) {
  const handleAddTextNode = useCallback(() => {
    const addNode = (position: XYPosition, reactFlowService: ReactFlowService) =>
      reactFlowService.addNodes([createTextNode({ position: position })]);
    onClick(addNode);
  }, [onClick]);

  return (
    <Button onClick={handleAddTextNode} {...buttonProps}>
      <Tooltip title="Add text node" arrow placement="right">
        <TextFieldsIcon />
      </Tooltip>
    </Button>
  );
}

export default AddTextNodeButton;
