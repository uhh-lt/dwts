import React, { useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import DeleteIcon from "@mui/icons-material/Delete";
import { ProjectRead, UserRead } from "../../../api/openapi";
import ProjectHooks from "../../../api/ProjectHooks";
import { QueryKey } from "../../../api/QueryKey";
import { LoadingButton } from "@mui/lab";
import UserHooks from "../../../api/UserHooks";
import ProjectUsersContextMenu from "./ProjectUsersContextMenu";
import { ContextMenuPosition } from "../../projects/ProjectContextMenu2";

interface ProjectUsersProps {
  project: ProjectRead;
}

function ProjectUsers({ project }: ProjectUsersProps) {
  const [selectedUser, setSelectedUser] = useState<UserRead | null>(null);
  const queryClient = useQueryClient();

  // query all users that belong to the project
  const allUsers = UserHooks.useGetAll();
  const projectUsers = ProjectHooks.useGetAllUsers(project.id);

  // list of users that are not associated with the project
  const autoCompleteUsers = useMemo(() => {
    if (!allUsers.data || !projectUsers.data) {
      return [];
    }

    const projectUserIds = projectUsers.data.map((user) => user.id);

    return allUsers.data.filter((user) => projectUserIds.indexOf(user.id) === -1);
  }, [projectUsers.data, allUsers.data]);

  // add user
  const addUserMutation = ProjectHooks.useAddUser({
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_USERS, project.id]);
      queryClient.invalidateQueries([QueryKey.USER_PROJECTS, data.id]);
      SnackbarAPI.openSnackbar({
        text: "Successfully added user " + data.first_name + "!",
        severity: "success",
      });
      setSelectedUser(null);
    },
  });
  const handleClickAddUser = () => {
    if (!selectedUser) return;
    addUserMutation.mutate({
      projId: project.id,
      userId: selectedUser.id,
    });
  };

  // remove user
  const removeUserMutation = ProjectHooks.useRemoveUser({
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_USERS, project.id]);
      queryClient.invalidateQueries([QueryKey.USER_PROJECTS, data.id]);
      SnackbarAPI.openSnackbar({
        text: "Successfully removed user " + data.first_name + "!",
        severity: "success",
      });
    },
  });
  const handleClickRemoveUser = (userId: number) => {
    removeUserMutation.mutate({
      projId: project.id,
      userId: userId,
    });
  };

  const handleChangeSelectedUser = (event: React.SyntheticEvent, value: UserRead | null) => {
    setSelectedUser(value);
  };

  // context menu 2
  const [contextMenuPosition, setContextMenuPosition] = React.useState<ContextMenuPosition | null>(null);
  const [contextMenuData, setContextMenuData] = React.useState<number | undefined>(undefined);
  const onContextMenu = (userId: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuData(userId);
  };

  return (
    <React.Fragment>
      <Toolbar variant="dense">
        <Stack direction="row" spacing={2} sx={{ width: "100%", alignItems: "center" }}>
          <Box sx={{ flex: "1 1 0", display: "flex", alignItems: "center" }}>
            <Typography variant="h6" color="inherit" component="div">
              Add user
            </Typography>
            {allUsers.isError ? (
              <Typography>Error: {allUsers.error.message}</Typography>
            ) : (
              <Autocomplete
                value={selectedUser}
                onChange={handleChangeSelectedUser}
                sx={{ ml: 1, flexGrow: 1 }}
                size="small"
                disablePortal
                options={autoCompleteUsers}
                renderInput={(params) => <TextField {...params} label="User" />}
                disabled={!allUsers.isSuccess}
                getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
              />
            )}
            <LoadingButton
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ ml: 1 }}
              onClick={handleClickAddUser}
              disabled={selectedUser === null}
              loading={addUserMutation.isLoading}
              loadingPosition="start"
            >
              Add
            </LoadingButton>
          </Box>
          <Typography variant="h6" color="inherit" component="div" sx={{ flex: "1 1 0" }}>
            Permission for User 1
          </Typography>
        </Stack>
      </Toolbar>
      <Divider />
      {projectUsers.isLoading && <CardContent>Loading users...</CardContent>}
      {projectUsers.isError && (
        <CardContent>An error occurred while loading project users for project {project.id}...</CardContent>
      )}
      {projectUsers.isSuccess && (
        <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
          <Box sx={{ flex: "1 1 0" }}>
            <List>
              {projectUsers.data.map((user) => (
                <ListItem
                  disablePadding
                  key={user.id}
                  onContextMenu={onContextMenu(user.id)}
                  secondaryAction={
                    <Tooltip title={"Remove user from project"}>
                      <span>
                        <IconButton onClick={() => handleClickRemoveUser(user.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  }
                >
                  <ListItemButton>
                    <ListItemText primary={user.first_name + " " + user.last_name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
          <Box sx={{ flex: "1 1 0" }}>
            <FormGroup>
              <FormControlLabel control={<Checkbox defaultChecked />} label="Can Search?" />
              <FormControlLabel control={<Checkbox defaultChecked />} label="Can upload files?" />
              <FormControlLabel control={<Checkbox defaultChecked />} label="Can delete files?" />
              <FormControlLabel control={<Checkbox defaultChecked />} label="Can annotate?" />
            </FormGroup>
          </Box>
        </Stack>
      )}
      <ProjectUsersContextMenu
        position={contextMenuPosition}
        userId={contextMenuData}
        handleClose={() => setContextMenuPosition(null)}
        onDeleteUser={handleClickRemoveUser}
      />
    </React.Fragment>
  );
}

export default ProjectUsers;
