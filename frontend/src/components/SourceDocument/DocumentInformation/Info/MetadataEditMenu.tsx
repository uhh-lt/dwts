import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Box,
  Button,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  PopoverPosition,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import React, { useCallback, useState } from "react";
import MetadataHooks from "../../../../api/MetadataHooks.ts";
import { MetaType } from "../../../../api/openapi/models/MetaType.ts";
import { ProjectMetadataRead } from "../../../../api/openapi/models/ProjectMetadataRead.ts";
import ConfirmationAPI from "../../../ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../../SnackbarDialog/useOpenSnackbar.ts";
import MetadataTypeSelectorMenu from "./MetadataTypeSelectorMenu.tsx";
import { metaTypeToIcon } from "./metaTypeToIcon.tsx";

interface MetadataEditMenuProps {
  projectMetadata: ProjectMetadataRead;
}

function MetadataEditMenu({ projectMetadata }: MetadataEditMenuProps) {
  // open close popover
  const [position, setPosition] = useState<PopoverPosition | undefined>();
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const boundingBox = event.currentTarget.getBoundingClientRect();
    setPosition({
      left: boundingBox.left,
      top: boundingBox.top + boundingBox.height,
    });
  };

  // metadata name
  const [name, setName] = useState(projectMetadata.key);
  const handleChangeName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  // metadata description
  const [description, setDescription] = useState(projectMetadata.description);
  const handleChangeDescription = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(event.target.value);
  };

  // change type
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [metatype, setMetatype] = useState(projectMetadata.metatype);
  const handleChangeType = (newType: string) => {
    setMetatype(newType as MetaType);
  };

  // closing / confirming changes
  const updateMutation = MetadataHooks.useUpdateProjectMetadata();

  const handleClose = () => {
    setPosition(undefined);

    // only update if data has changed!
    if (
      projectMetadata.metatype !== metatype ||
      projectMetadata.key !== name ||
      projectMetadata.description !== description
    ) {
      const mutation = updateMutation.mutate;
      const actuallyMutate = () =>
        mutation({
          metadataId: projectMetadata.id,
          requestBody: {
            metatype: metatype,
            key: name,
            description: description,
          },
        });
      if (projectMetadata.metatype !== metatype) {
        ConfirmationAPI.openConfirmationDialog({
          text: "Changing the type of this metadata will remove its existing entries. This action cannot be undone. Do you want to proceed?",
          onAccept: actuallyMutate,
          onReject() {
            setMetatype(projectMetadata.metatype);
          },
        });
      } else {
        actuallyMutate();
      }
    }
  };

  // deletion
  const openSnackbar = useOpenSnackbar();
  const deleteMutation = MetadataHooks.useDeleteProjectMetadata();
  const handleDeleteMetadata = useCallback(() => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete the ProjectMetadata ${projectMetadata.id}? This will remove metadata from all corresponding documents. This action cannot be undone!`,
      onAccept: () => {
        const mutation = deleteMutation.mutate;
        mutation(
          {
            metadataId: projectMetadata.id,
          },
          {
            onSuccess: (data) => {
              openSnackbar({
                text: `Deleted Metadata ${data.id} from Project ${data.project_id}`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  }, [deleteMutation.mutate, projectMetadata.id, openSnackbar]);

  return (
    <>
      <Tooltip title={projectMetadata.description} placement="left">
        <span style={{ flexGrow: 1, flexBasis: 1, justifyContent: "start" }}>
          <Button
            onClick={handleClick}
            color="inherit"
            startIcon={metaTypeToIcon[projectMetadata.metatype]}
            disabled={projectMetadata.read_only}
          >
            {projectMetadata.key}
          </Button>
        </span>
      </Tooltip>
      <Popover
        open={Boolean(position)}
        onClose={handleClose}
        anchorPosition={position}
        anchorReference="anchorPosition"
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        elevation={2}
        slotProps={{ paper: { sx: { width: 240 } } }}
      >
        <Stack gap={2} p={1}>
          <TextField fullWidth size="small" value={name} onChange={handleChangeName} label="Name" />
          <TextField
            fullWidth
            size="small"
            value={description}
            onChange={handleChangeDescription}
            label="Description"
          />
        </Stack>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setIsTypeMenuOpen(true)}>
            <ListItemText>Type</ListItemText>
            <Box sx={{ textAlign: "right", color: "text.secondary", display: "flex", alignItems: "center", gap: 1 }}>
              {metaTypeToIcon[metatype]}
              {metatype}
            </Box>
          </ListItemButton>
        </ListItem>
        <Divider />
        <ListItem disablePadding>
          <ListItemButton disabled>
            <ListItemIcon>
              <ContentCopyIcon />
            </ListItemIcon>
            <ListItemText>Duplicate metadata</ListItemText>
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleDeleteMetadata}>
            <ListItemIcon>
              <DeleteIcon />
            </ListItemIcon>
            <ListItemText>Delete metadata</ListItemText>
          </ListItemButton>
        </ListItem>
      </Popover>
      <MetadataTypeSelectorMenu
        placeholder="Change type..."
        position={isTypeMenuOpen ? position : undefined}
        handleClose={() => setIsTypeMenuOpen(false)}
        handleMenuItemClick={handleChangeType}
      />
    </>
  );
}

export default MetadataEditMenu;
