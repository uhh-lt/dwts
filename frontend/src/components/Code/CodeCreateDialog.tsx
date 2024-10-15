import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, rgbToHex } from "@mui/material";
import { useEffect, useMemo } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import CodeHooks from "../../api/CodeHooks.ts";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { useAuth } from "../../auth/useAuth.ts";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { contrastiveColors } from "../../utils/colors.ts";
import { AnnoActions } from "../../views/annotation/annoSlice.ts";
import FormColorPicker from "../FormInputs/FormColorPicker.tsx";
import FormMenu from "../FormInputs/FormMenu.tsx";
import FormText from "../FormInputs/FormText.tsx";
import FormTextMultiline from "../FormInputs/FormTextMultiline.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import CodeRenderer from "./CodeRenderer.tsx";

export type CodeCreateSuccessHandler = ((code: CodeRead, isNewCode: boolean) => void) | undefined;

type CodeCreateValues = {
  parentCodeId: string | number;
  name: string;
  color: string;
  description: string;
};

function CodeCreateDialog() {
  // global state
  const { projectId } = useParams() as { projectId: string };
  const { user } = useAuth();

  // global server state (react query)
  const codes = ProjectHooks.useGetAllCodes(parseInt(projectId));

  // computed
  const parentCodes = useMemo(() => codes.data?.filter((code) => !code.is_system) || [], [codes.data]);

  // global client state (redux)
  const onSuccessHandler = useAppSelector((state) => state.dialog.codeCreateSuccessHandler);
  const isCodeCreateDialogOpen = useAppSelector((state) => state.dialog.isCodeCreateDialogOpen);
  const codeName = useAppSelector((state) => state.dialog.codeName);
  const parentCodeId = useAppSelector((state) => state.dialog.parentCodeId);
  const dispatch = useAppDispatch();

  // react form
  const {
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<CodeCreateValues>({
    defaultValues: {
      parentCodeId: undefined,
      name: "",
      color: "#000000",
      description: "",
    },
  });

  // mutations
  const createCodeMutation = CodeHooks.useCreateCode();

  // initialize form when code changes
  useEffect(() => {
    // reset
    const randomHexColor = rgbToHex(contrastiveColors[Math.floor(Math.random() * contrastiveColors.length)]);
    const isParentCodeIdInParentCodes = parentCodes.find((c) => c.id === parentCodeId);
    reset({
      name: codeName || "",
      color: randomHexColor,
      parentCodeId: isParentCodeIdInParentCodes ? parentCodeId || -1 : -1,
    });
  }, [codeName, parentCodeId, parentCodes, reset]);

  // ui event handlers
  const handleCloseCodeCreateDialog = () => {
    dispatch(CRUDDialogActions.closeCodeCreateDialog());
  };

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // react form handlers
  const handleSubmitCodeCreateDialog: SubmitHandler<CodeCreateValues> = (data) => {
    if (user) {
      let pcid: number | undefined = undefined;
      if (typeof data.parentCodeId === "string") {
        pcid = parseInt(data.parentCodeId);
      } else {
        pcid = data.parentCodeId;
      }
      createCodeMutation.mutate(
        {
          requestBody: {
            name: data.name,
            description: data.description,
            color: data.color,
            project_id: parseInt(projectId),
            parent_id: pcid === -1 ? null : pcid,
            is_system: false,
          },
        },
        {
          onSuccess: (data) => {
            openSnackbar({
              text: `Added new Code ${data.name}!`,
              severity: "success",
            });

            // if we add a new code successfully, we want to show the code in the code explorer
            // this means, we have to expand the parent codes, so the new code is visible
            const codesToExpand = [];
            let parentCodeId = data.parent_id;
            while (parentCodeId) {
              const currentParentCodeId = parentCodeId;

              codesToExpand.push(parentCodeId);
              parentCodeId = codes.data?.find((code) => code.id === currentParentCodeId)?.parent_id;
            }
            dispatch(AnnoActions.expandCodes(codesToExpand.map((id) => id.toString())));
            if (onSuccessHandler) onSuccessHandler(data, true);
            handleCloseCodeCreateDialog();
          },
        },
      );
    }
  };

  const handleErrorCodeCreateDialog: SubmitErrorHandler<CodeCreateValues> = (data) => console.error(data);

  // rendering
  return (
    <Dialog open={isCodeCreateDialogOpen} onClose={handleCloseCodeCreateDialog} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleSubmitCodeCreateDialog, handleErrorCodeCreateDialog)}>
        <DialogTitle>Create a new code</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <FormMenu
              name="parentCodeId"
              control={control}
              textFieldProps={{
                label: "Parent Code",
                error: Boolean(errors.parentCodeId),
                helperText: <ErrorMessage errors={errors} name="parentCodeId" />,
                variant: "filled",
              }}
            >
              <MenuItem key={-1} value={-1}>
                No parent
              </MenuItem>
              {parentCodes &&
                parentCodes.map((code) => (
                  <MenuItem key={code.id} value={code.id}>
                    <CodeRenderer code={code} />
                  </MenuItem>
                ))}
            </FormMenu>
            <FormText
              name="name"
              control={control}
              rules={{ required: "Name is required" }}
              textFieldProps={{
                label: "Name",
                error: Boolean(errors.name),
                helperText: <ErrorMessage errors={errors} name="name" />,
                variant: "standard",
              }}
            />
            <FormColorPicker
              name="color"
              control={control}
              rules={{ required: "Color is required" }}
              textFieldProps={{
                label: "Color",
                error: Boolean(errors.color),
                helperText: <ErrorMessage errors={errors} name="color" />,
                variant: "standard",
                fullWidth: true,
                slotProps: {
                  inputLabel: { shrink: true },
                },
              }}
            />
            <FormTextMultiline
              name="description"
              control={control}
              rules={{ required: "Description is required" }}
              textFieldProps={{
                label: "Description",
                error: Boolean(errors.description),
                helperText: <ErrorMessage errors={errors} name="description" />,
                variant: "standard",
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleCloseCodeCreateDialog}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
            fullWidth
            type="submit"
            loading={createCodeMutation.isPending}
            loadingPosition="start"
          >
            Create Code
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default CodeCreateDialog;
