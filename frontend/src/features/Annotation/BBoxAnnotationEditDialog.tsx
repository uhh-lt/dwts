import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Box, Button, ButtonProps, Dialog, DialogActions, DialogTitle, Divider } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import eventBus from "../../EventBus";
import BBoxAnnotationRenderer from "../../components/DataGrid/BBoxAnnotationRenderer";
import CodeSelector from "../../components/Selectors/CodeSelector";
import SnackbarAPI from "../Snackbar/SnackbarAPI";
import { BBoxAnnotationReadResolvedCode, CodeRead } from "../../api/openapi";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks";

export const openBBoxAnnotationEditDialog = (annotation: BBoxAnnotationReadResolvedCode) => {
  eventBus.dispatch("open-edit-bboxAnnotation", annotation);
};

export interface BBoxAnnotationEditDialogProps extends ButtonProps {
  projectId: number;
}

function BBoxAnnotationEditDialog({ projectId }: BBoxAnnotationEditDialogProps) {
  // local state
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<CodeRead | undefined>(undefined);
  const [annotation, setAnnotation] = useState<BBoxAnnotationReadResolvedCode | undefined>(undefined);

  // listen to event
  // create a (memoized) function that stays the same across re-renders
  const onOpenEditAnnotation = useCallback((event: CustomEventInit<BBoxAnnotationReadResolvedCode>) => {
    if (!event.detail) return;

    setOpen(true);
    setAnnotation(event.detail);
    setSelectedCode(event.detail.code);
  }, []);

  useEffect(() => {
    eventBus.on("open-edit-bboxAnnotation", onOpenEditAnnotation);
    return () => {
      eventBus.remove("open-edit-bboxAnnotation", onOpenEditAnnotation);
    };
  }, [onOpenEditAnnotation]);

  // mutations
  const updateAnnotationMutation = BboxAnnotationHooks.useUpdate();

  const handleClose = () => {
    setOpen(false);
    setSelectedCode(undefined);
    setAnnotation(undefined);
  };

  const handleUpdateAnnotation = () => {
    if (!selectedCode || !annotation) return;

    console.log("anono", annotation);

    updateAnnotationMutation.mutate(
      {
        bboxToUpdate: annotation,
        requestBody: {
          code_id: selectedCode.id,
        },
      },
      {
        onSuccess: (data) => {
          handleClose();
          SnackbarAPI.openSnackbar({
            text: `Updated annotation!`,
            severity: "success",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Change the code of the annotation</DialogTitle>
      <CodeSelector
        projectId={projectId}
        setSelectedCodes={(codes) => setSelectedCode(codes.length > 0 ? codes[0] : undefined)}
        allowMultiselect={false}
        height="400px"
      />
      {!!annotation && (
        <>
          <Divider />
          <DialogTitle style={{ paddingBottom: 0 }}>Preview</DialogTitle>
          <Box px={3} mb={2}>
            Before:
            <BBoxAnnotationRenderer bboxAnnotation={annotation} />
            After:
            <BBoxAnnotationRenderer
              bboxAnnotation={selectedCode ? { ...annotation, code: selectedCode } : annotation}
            />
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
          disabled={!selectedCode || selectedCode?.id === annotation?.code.id}
          loading={updateAnnotationMutation.isLoading}
          loadingPosition="start"
        >
          Update Annotation
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default BBoxAnnotationEditDialog;
