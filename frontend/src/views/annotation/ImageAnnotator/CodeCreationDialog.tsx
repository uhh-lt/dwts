import React, { forwardRef, useImperativeHandle, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../auth/AuthProvider";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import CodeHooks from "../../../api/CodeHooks";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { QueryKey } from "../../../api/QueryKey";
import { CodeRead } from "../../../api/openapi";
import { useAppSelector } from "../../../plugins/ReduxHooks";

interface CodeCreationDialogProps {
  onCreateSuccess: (code: CodeRead) => void;
}

export interface CodeCreationDialogHandle {
  open: (name?: string) => void;
}

// todo: refactor, this is basically the same as CodeExplorer/CodeCreationDialog.tsx
const CodeCreationDialog = forwardRef<CodeCreationDialogHandle, CodeCreationDialogProps>(({ onCreateSuccess }, ref) => {
  // global state
  const { projectId } = useParams() as { projectId: string };
  const { user } = useAuth();

  // global state (redux)
  const parentCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const parentCode = CodeHooks.useGetCode(parentCodeId);

  // local state
  const [isCodeCreateDialogOpen, setIsCodeCreateDialogOpen] = useState(false);

  // react form
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm();

  // mutations
  const queryClient = useQueryClient();
  const createCodeMutation = CodeHooks.useCreateCode({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.CODE, data.id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_CODES, parseInt(projectId, 10)]);
      queryClient.invalidateQueries([QueryKey.USER_CODES, user.data!.id]);
      SnackbarAPI.openSnackbar({
        text: `Added new Code ${data.name}!`,
        severity: "success",
      });
      closeCodeCreateDialog();
      onCreateSuccess(data);
    },
  });

  // exposed methods (via forward ref)
  useImperativeHandle(ref, () => ({
    open: openCodeCreateDialog,
  }));

  // methods
  const openCodeCreateDialog = (name?: string) => {
    setValue("name", name ? name : "");
    setIsCodeCreateDialogOpen(true);
  };

  const closeCodeCreateDialog = () => {
    reset();
    setIsCodeCreateDialogOpen(false);
  };

  // ui event handlers
  const handleCloseCodeCreateDialog = () => {
    closeCodeCreateDialog();
  };

  // react form handlers
  const handleSubmitCodeCreateDialog = (data: any) => {
    if (user.data) {
      createCodeMutation.mutate({
        requestBody: {
          name: data.name,
          description: data.description,
          color: data.color,
          project_id: parseInt(projectId),
          user_id: user.data.id,
          parent_code_id: parentCodeId,
        },
      });
    }
  };

  const handleErrorCodeCreateDialog = (data: any) => console.error(data);

  // rendering
  return (
    <Dialog open={isCodeCreateDialogOpen} onClose={handleCloseCodeCreateDialog}>
      <form onSubmit={handleSubmit(handleSubmitCodeCreateDialog, handleErrorCodeCreateDialog)}>
        <DialogTitle>Create a new code</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            {parentCodeId && parentCode.isSuccess ? (
              <DialogContentText>
                Add your new code. It will be added as a child of {parentCode.data.name}.
              </DialogContentText>
            ) : (
              <DialogContentText>Add your new code. It will be added to the root.</DialogContentText>
            )}
            <TextField
              label="Name"
              fullWidth
              variant="standard"
              {...register("name", { required: "Name is required" })}
              error={Boolean(errors.name)}
              helperText={<ErrorMessage errors={errors} name="name" />}
            />
            <TextField
              label="Color"
              fullWidth
              variant="standard"
              {...register("color", { required: "Color is required" })}
              error={Boolean(errors.color)}
              helperText={<ErrorMessage errors={errors} name="color" />}
            />
            <TextField
              multiline
              minRows={5}
              label="Description"
              fullWidth
              variant="standard"
              {...register("description", { required: "Description is required" })}
              error={Boolean(errors.description)}
              helperText={<ErrorMessage errors={errors} name="description" />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCodeCreateDialog}>Cancel</Button>
          <LoadingButton type="submit" loading={createCodeMutation.isLoading}>
            Create Code
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
});

export default CodeCreationDialog;
