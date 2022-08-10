import React, {useMemo, useState} from "react";
import {
  Autocomplete,
  Box,
  Button,
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
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import DeleteIcon from "@mui/icons-material/Delete";
import {ProjectRead, UserRead} from "../../../api/openapi";
import ProjectHooks from "../../../api/ProjectHooks";
import { QueryKey } from "../../../api/QueryKey";
import UserHooks from "../../../api/UserHooks";

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

    const projectUserIds = projectUsers.data.map(user => user.id);

    return allUsers.data.filter((user) => projectUserIds.indexOf(user.id) === -1)
  }, [projectUsers.data, allUsers.data]);

  // add user
  const addUserMutation = ProjectHooks.useAddUser({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_USERS, project.id]);
      SnackbarAPI.openSnackbar({
        text: "Successfully added user " + data.first_name + "!",
        severity: "success",
      });
      setSelectedUser(null);
    },
  });
  const handleClickAddUser = () => {
    if(!selectedUser) return;
    addUserMutation.mutate({
      projId: project.id,
      userId: selectedUser.id,
    });
  };

  // remove user
  const removeUserMutation = ProjectHooks.useRemoveUser({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_USERS, project.id]);
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
    setSelectedUser(value)
  }

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
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ ml: 1 }}
              onClick={handleClickAddUser}
              disabled={addUserMutation.isLoading || selectedUser === null}
            >
              Add
            </Button>
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
                  secondaryAction={
                    <IconButton onClick={() => handleClickRemoveUser(user.id)}>
                      <DeleteIcon />
                    </IconButton>
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
    </React.Fragment>
  );
}

export default ProjectUsers;
