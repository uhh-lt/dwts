import { ErrorMessage } from "@hookform/error-message";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { COTAConcept } from "../../../api/openapi";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import ColorUtils from "../../../utils/ColorUtils";

interface CotaConceptEditorProps {
  onUpdate: (concept: COTAConcept) => void;
  onCancel: (concept: COTAConcept) => void;
  isDescriptionEditable: boolean;
}

function CotaConceptEditor({ onUpdate, onCancel, isDescriptionEditable }: CotaConceptEditorProps) {
  // local state
  const [color, setColor] = useState("#000000");

  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<COTAConcept>();

  // redux
  const currentConcept = useAppSelector((state) => state.cota.currentConcept);
  const conceptEditorOpen = useAppSelector((state) => state.cota.conceptEditorOpen);

  // reset the form when the current concept changes
  useEffect(() => {
    const c = ColorUtils.rgbStringToHex(currentConcept.color) || currentConcept.color;
    reset({
      ...currentConcept,
      color: c,
    });
    setColor(c);
  }, [currentConcept, reset, setValue]);

  // event handling
  const handleClose = () => {
    onCancel(currentConcept);
  };

  // form handling
  const handleUpdate: SubmitHandler<COTAConcept> = (data) => {
    onUpdate(data);
  };
  const handleError: SubmitErrorHandler<COTAConcept> = (data) => console.error(data);

  return (
    <Dialog open={conceptEditorOpen} onClose={handleClose} fullWidth maxWidth="md">
      <form onSubmit={handleSubmit(handleUpdate, handleError)}>
        <DialogTitle>Add / edit concept</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              variant="outlined"
              key={`${currentConcept.name}-name`}
              {...register("name", { required: "Name is required" })}
              error={Boolean(errors.name)}
              helperText={<ErrorMessage errors={errors} name="name" />}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Description"
              fullWidth
              variant="outlined"
              key={`${currentConcept.id}-description`}
              {...register("description", { required: "Description is required" })}
              error={Boolean(errors.description)}
              helperText={
                isDescriptionEditable ? (
                  <ErrorMessage errors={errors} name="description" />
                ) : (
                  "Please reset the analysis to edit the concept description."
                )
              }
              InputLabelProps={{ shrink: true }}
              disabled={!isDescriptionEditable}
            />
            <Stack direction="row">
              <TextField
                label="Color"
                fullWidth
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
                key={`${currentConcept.name}-color`}
                {...register("color", { required: "Color is required" })}
                onChange={(e) => setColor(e.target.value)}
                error={Boolean(errors.color)}
                helperText={<ErrorMessage errors={errors} name="color" />}
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ width: 55, height: 55, backgroundColor: color, ml: 1, flexShrink: 0 }} />
            </Stack>
            <HexColorPicker
              style={{ width: "100%" }}
              color={color}
              onChange={(newColor) => {
                setValue("color", newColor); // set value of text input
                setColor(newColor); // set value of color picker (and box)
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Button variant="contained" color="success" type="submit">
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default CotaConceptEditor;
