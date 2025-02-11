import { ButtonProps } from "@mui/material";
import { PendingAddNodeAction } from "./PendingAddNodeAction.ts";

export interface AddNodeDialogProps {
  onClick: (action: PendingAddNodeAction) => void;
  buttonProps?: Omit<ButtonProps, "onClick">;
}
