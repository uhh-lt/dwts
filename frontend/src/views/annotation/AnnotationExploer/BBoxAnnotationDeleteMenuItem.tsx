import DeleteIcon from "@mui/icons-material/Delete";
import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import React from "react";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";

interface BBoxAnnotationDeleteMenuItemProps {
  annotationId: number;
  onClick?: () => void;
}

function BBoxAnnotationDeleteMenuItem({
  annotationId,
  onClick,
  ...props
}: BBoxAnnotationDeleteMenuItemProps & MenuItemProps) {
  const deleteMutation = BboxAnnotationHooks.useDeleteBBoxAnnotation();

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the BBoxAnnotation ${annotationId}? You can reassign it later!`,
      onAccept: () => {
        deleteMutation.mutate({ bboxToDelete: annotationId });
      },
    });

    if (onClick) onClick();
  };

  return (
    <MenuItem onClick={handleClick} {...props}>
      <ListItemIcon>
        <DeleteIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Delete bbox annotation</ListItemText>
    </MenuItem>
  );
}

export default BBoxAnnotationDeleteMenuItem;
