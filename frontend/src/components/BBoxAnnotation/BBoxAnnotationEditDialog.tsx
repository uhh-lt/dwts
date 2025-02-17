import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Button, ButtonProps, Dialog, DialogActions, DialogTitle, Divider } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useState } from "react";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks.ts";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import CodeTable from "../Code/CodeTable.tsx";
import { CRUDDialogActions } from "../dialogSlice.ts";
import BBoxAnnotationRenderer from "./BBoxAnnotationRenderer.tsx";

export interface BBoxAnnotationEditDialogProps extends ButtonProps {
  projectId: number;
}

function BBoxAnnotationEditDialog({ projectId }: BBoxAnnotationEditDialogProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const selectedCodeId =
    Object.keys(rowSelectionModel).length === 1 ? parseInt(Object.keys(rowSelectionModel)[0]) : undefined;

  // global client state (redux)
  const open = useAppSelector((state) => state.dialog.isBBoxAnnotationEditDialogOpen);
  const annotation = useAppSelector((state) => state.dialog.bboxAnnotation);
  const dispatch = useAppDispatch();

  // mutations
  const updateAnnotationMutation = BboxAnnotationHooks.useUpdateBBoxAnnotation();

  // actions
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeBBoxAnnotationEditDialog());
    setRowSelectionModel({});
  };

  // snackbar
  const openSnackbar = useOpenSnackbar();

  const handleUpdateAnnotation = () => {
    if (!selectedCodeId || !annotation) return;

    updateAnnotationMutation.mutate(
      {
        bboxToUpdate: annotation,
        requestBody: {
          code_id: selectedCodeId,
        },
      },
      {
        onSuccess: () => {
          handleClose();
          openSnackbar({
            text: `Updated annotation!`,
            severity: "success",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Change the code of the annotation</DialogTitle>
      <CodeTable
        projectId={projectId}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
      />
      {!!annotation && (
        <>
          <Divider />
          <DialogTitle style={{ paddingBottom: 0 }}>Preview</DialogTitle>
          <Box px={3} mb={2}>
            Before:
            <BBoxAnnotationRenderer bboxAnnotation={annotation} />
            After:
            {selectedCodeId ? (
              <BBoxAnnotationRenderer
                bboxAnnotation={selectedCodeId ? { ...annotation, code_id: selectedCodeId } : annotation}
              />
            ) : (
              <>
                <br />
                Select a code to preview the change.
              </>
            )}
          </Box>
        </>
      )}

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <LoadingButton
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          fullWidth
          onClick={handleUpdateAnnotation}
          disabled={!selectedCodeId || selectedCodeId === annotation?.code_id}
          loading={updateAnnotationMutation.isPending}
          loadingPosition="start"
        >
          Update Annotation
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default BBoxAnnotationEditDialog;
