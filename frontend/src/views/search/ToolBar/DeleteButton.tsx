import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import * as React from "react";
import { IconButtonProps } from "@mui/material";

function DeleteButton(props: IconButtonProps) {
  return (
    <Tooltip title="Delete">
      <IconButton {...props}>
        <DeleteIcon />
      </IconButton>
    </Tooltip>
  );
}

export default DeleteButton;
