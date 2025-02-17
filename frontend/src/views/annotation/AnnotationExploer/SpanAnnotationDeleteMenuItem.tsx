import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";

interface SpanAnnotationDeleteMenuItemProps {
  annotationId: number;
  onClick?: () => void;
}

function SpanAnnotationDeleteMenuItem({
  annotationId,
  onClick,
  ...props
}: SpanAnnotationDeleteMenuItemProps & MenuItemProps) {
  const deleteMutation = SpanAnnotationHooks.useDeleteSpanAnnotation();

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the SpanAnnotation ${annotationId}? You can reassign it later!`,
      onAccept: () => {
        deleteMutation.mutate({ spanAnnotationToDelete: annotationId });
      },
    });

    if (onClick) onClick();
  };

  return (
    <MenuItem onClick={handleClick} {...props}>
      <ListItemIcon>
        <DeleteIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Delete span annotation</ListItemText>
    </MenuItem>
  );
}

export default SpanAnnotationDeleteMenuItem;
