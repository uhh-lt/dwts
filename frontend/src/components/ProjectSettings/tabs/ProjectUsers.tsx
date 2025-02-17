import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { LoadingButton } from "@mui/lab";
import {
  Box,
  CardContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import UserHooks from "../../../api/UserHooks.ts";
import { EMAIL_REGEX } from "../../../utils/GlobalConstants.ts";
import ConfirmationAPI from "../../ConfirmationDialog/ConfirmationAPI.ts";
import FormEmail from "../../FormInputs/FormEmail.tsx";
import { ProjectProps } from "../ProjectProps.ts";

interface UserAddFormValues {
  email: string;
}

function ProjectUsers({ project }: ProjectProps) {
  // query all users that belong to the project
  const allUsers = UserHooks.useGetAllUsers();

  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<UserAddFormValues>({
    defaultValues: {
      email: "",
    },
  });

  // form handling
  const addUserMutation = UserHooks.useAddUserToProject();
  const handleAddUser: SubmitHandler<UserAddFormValues> = (data) => {
    addUserMutation.mutate({
      projId: project.id,
      requestBody: {
        email: data.email,
      },
    });
  };
  const handleError: SubmitErrorHandler<UserAddFormValues> = (data) => console.error(data);

  // remove user
  const removeUserMutation = UserHooks.useRemoveUserFromProject();
  const handleClickRemoveUser = (userId: number) => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the User ${userId} from this project? You can add her again.`,
      onAccept: () => {
        removeUserMutation.mutate({
          projId: project.id,
          userId: userId,
        });
      },
    });
  };

  return (
    <Box display="flex" className="myFlexContainer h100">
      <form onSubmit={handleSubmit(handleAddUser, handleError)}>
        <Toolbar variant="dense" className="myFlexFitContentContainer">
          <Stack direction="row" spacing={2} sx={{ width: "100%", alignItems: "center" }}>
            <Typography variant="h6" component="div" flexShrink={0}>
              Add user
            </Typography>
            <FormEmail
              name="email"
              control={control}
              rules={{
                required: "E-Mail is required",
                validate: (value) => {
                  return [EMAIL_REGEX].every((pattern) => pattern.test(value)) || "Please enter a valid email address!";
                },
              }}
              textFieldProps={{
                label: "E-Mail",
                variant: "outlined",
                fullWidth: true,
                error: Boolean(errors.email),
                size: "small",
              }}
            />
            <LoadingButton
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ ml: 1 }}
              type="submit"
              disabled={addUserMutation.isPending}
              loading={addUserMutation.isPending}
              loadingPosition="start"
            >
              Add
            </LoadingButton>
          </Stack>
        </Toolbar>
      </form>

      <Divider />
      {allUsers.isLoading && <CardContent>Loading users...</CardContent>}
      {allUsers.isError && (
        <CardContent>An error occurred while loading project users for project {project.id}...</CardContent>
      )}
      {allUsers.isSuccess && (
        <List style={{ maxHeight: "100%" }}>
          {allUsers.data.map((user) => (
            <ListItem
              disablePadding
              key={user.id}
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
                <ListItemText primary={user.first_name + " " + user.last_name + " - " + user.email + ""} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

export default ProjectUsers;
