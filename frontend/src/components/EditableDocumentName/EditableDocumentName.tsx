import { ErrorMessage } from "@hookform/error-message";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import {
  IconButton,
  InputBaseComponentProps,
  Stack,
  TextField,
  Tooltip,
  Typography,
  TypographyProps,
} from "@mui/material";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import SdocHooks from "../../api/SdocHooks";
import SnackbarAPI from "../../features/Snackbar/SnackbarAPI";
import DocumentLinkToOriginal from "../../views/search/DocumentViewer/DocumentLinkToOriginal";

type EditFormValues = {
  name: string;
};

interface EditableDocumentNameProps {
  sdocId: number | undefined;
  inputProps?: InputBaseComponentProps;
  children?: React.ReactNode;
}

export interface EditableDocumentNameHandle {
  toggle: () => void;
}

const EditableDocumentName = forwardRef<EditableDocumentNameHandle, EditableDocumentNameProps & TypographyProps>(
  ({ sdocId, inputProps, children, ...props }, ref) => {
    // local state
    const [isEditing, setIsEditing] = useState(false);

    // react form
    const {
      register,
      handleSubmit,
      setValue,
      formState: { errors },
      reset,
    } = useForm<EditFormValues>();

    // global server state (react-query)
    const nameMetadata = SdocHooks.useGetName(sdocId);
    const updateNameMutation = SdocHooks.useUpdateName();

    // exposed methods (via ref)
    useImperativeHandle(ref, () => ({
      toggle: toggleEditForm,
    }));

    // handlers
    const toggleEditForm = () => {
      setIsEditing((isEditing) => !isEditing);
    };

    const handleSubmitEditForm: SubmitHandler<EditFormValues> = (data) => {
      if (nameMetadata.isSuccess) {
        if (data.name === nameMetadata.data.value) {
          setIsEditing(false);
          return;
        }

        updateNameMutation.mutate(
          {
            metadataId: nameMetadata.data.id,
            requestBody: {
              key: nameMetadata.data.key,
              value: data.name,
            },
          },
          {
            onSuccess: (data) => {
              SnackbarAPI.openSnackbar({
                text: `Updated document name to ${data.value}`,
                severity: "success",
              });
              setIsEditing(false);
            },
          }
        );
      }
    };

    const handleError: SubmitErrorHandler<EditFormValues> = (data) => console.error(data);

    // effects
    useEffect(() => {
      if (isEditing) {
        if (nameMetadata.isSuccess) {
          setValue("name", nameMetadata.data.value);
        }
      } else {
        reset();
      }
    }, [isEditing, nameMetadata.data, nameMetadata.isSuccess, reset, setValue]);

    // render
    if (isEditing) {
      return (
        <form onSubmit={handleSubmit(handleSubmitEditForm, handleError)}>
          <Stack direction={"row"} alignItems={"center"} spacing={1}>
            <TextField
              autoFocus
              InputProps={{
                sx: { m: 0 },
                inputProps: inputProps,
              }}
              variant="standard"
              {...register("name", { required: "Name is required" })}
              error={Boolean(errors.name)}
              helperText={<ErrorMessage errors={errors} name="name" />}
            />
            <Tooltip title="Cancel">
              <IconButton onClick={() => setIsEditing(false)}>
                <CloseIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Save">
              <IconButton type="submit" disabled={updateNameMutation.isLoading}>
                <SaveIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </form>
      );
    } else {
      return (
        <DocumentLinkToOriginal sdocId={sdocId}>
          <Typography {...props}>
            {nameMetadata.isSuccess ? (
              <>{nameMetadata.data.value}</>
            ) : nameMetadata.isError ? (
              <>{nameMetadata.error.message}</>
            ) : (
              <>Loading...</>
            )}
          </Typography>
        </DocumentLinkToOriginal>
      );
    }
  }
);

export default EditableDocumentName;
