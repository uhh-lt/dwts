import { IconButton, IconButtonProps, Tooltip, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI";
import SnackbarAPI from "../Snackbar/SnackbarAPI";
import MemoHooks from "../../api/MemoHooks";
import { MemoEvent } from "./MemoAPI";

interface MemoDeleteButtonProps {
  memoTitle?: string;
}

function MemoDeleteButton({
  memoId,
  memoTitle,
  attachedObjectId,
  attachedObjectType,
  ...props
}: MemoEvent & MemoDeleteButtonProps & IconButtonProps) {
  const deleteMutation = MemoHooks.useDeleteMemo();
  const handleDeleteMemo = () => {
    if (memoId) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to remove the Memo "${memoTitle}"? This action cannot be undone!`,
        onAccept: () => {
          deleteMutation.mutate(
            { memoId: memoId },
            {
              onSuccess: () => {
                SnackbarAPI.openSnackbar({
                  text: `Deleted memo ${memoTitle}`,
                  severity: "success",
                });
              },
            },
          );
        },
      });
    } else {
      throw Error("Invalid invocation of handleDeleteTagMemo. No memo to delete.");
    }
  };

  return (
    <Tooltip title={"Delete memo"}>
      <span>
        <IconButton onClick={handleDeleteMemo} size={"small"} disableRipple>
          <DeleteIcon /> <Typography variant="body1">Delete Memo</Typography>
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default MemoDeleteButton;
