import FeedbackHooks from "../../api/FeedbackHooks";
import SnackbarAPI from "../snackbar/SnackbarAPI";
import { QueryKey } from "../../api/QueryKey";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogActions, DialogContent, DialogTitle, Fab, Stack, TextField } from "@mui/material";
import FeedbackIcon from "@mui/icons-material/Feedback";
import { useAuth } from "../../auth/AuthProvider";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import SaveIcon from "@mui/icons-material/Save";
import { useLocation } from "react-router-dom";

function FloatingFeedbackButton() {
  const { user, isLoggedIn } = useAuth();
  const location = useLocation();

  // react form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  // local state
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);

  // mutations
  const queryClient = useQueryClient();
  const createMutation = FeedbackHooks.useCreateFeedback({
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.FEEDBACKS]);
      SnackbarAPI.openSnackbar({
        text: `Thanks for your feedback!`,
        severity: "success",
      });
      closeFeedbackDialog();
    },
  });

  // dialog event handlers
  const openFeedbackDialog = () => {
    reset();
    setIsFeedbackDialogOpen(true);
  };
  const closeFeedbackDialog = () => {
    setIsFeedbackDialogOpen(false);
  };

  // form event handlers
  const handleSubmitFeedback = (data: any) => {
    if (user.data) {
      createMutation.mutate({
        requestBody: {
          user_id: user.data.id,
          user_content: `URL: ${location.pathname}\n${data.content}`,
        },
      });
    }
  };
  const handleError = (data: any) => console.error(data);

  return (
    <>
      {isLoggedIn ? (
        <Fab color="primary" onClick={openFeedbackDialog} sx={{ position: "absolute", bottom: 16, right: 16 }}>
          <FeedbackIcon />
        </Fab>
      ) : null}
      <Dialog open={isFeedbackDialogOpen} onClose={closeFeedbackDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(handleSubmitFeedback, handleError)}>
          <DialogTitle>Submit your feedback</DialogTitle>
          <DialogContent>
            <Stack spacing={3}>
              <TextField
                multiline
                minRows={5}
                label="Feedback"
                fullWidth
                variant="standard"
                {...register("content", { required: "Content is required" })}
                error={Boolean(errors.content)}
                helperText={<ErrorMessage errors={errors} name="content" />}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <LoadingButton
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              fullWidth
              type="submit"
              loading={createMutation.isLoading}
              loadingPosition="start"
            >
              Submit Feedback
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

export default FloatingFeedbackButton;
