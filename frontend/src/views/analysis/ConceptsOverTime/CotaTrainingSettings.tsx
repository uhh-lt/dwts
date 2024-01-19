import { ErrorMessage } from "@hookform/error-message";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { COTARead, COTATrainingSettings, DimensionalityReductionAlgorithm } from "../../../api/openapi";
import { useAppSelector } from "../../../plugins/ReduxHooks";

interface CotaTrainingSettingsProps {
  cota: COTARead;
  onUpdate: (trainingSettings: COTATrainingSettings) => void;
  onCancel: () => void;
}

function CotaTrainingSettings({ cota, onUpdate, onCancel }: CotaTrainingSettingsProps) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<COTATrainingSettings>();

  // global server state (react-query)
  const trainingSettings = useAppSelector((state) => state.cota.trainingSettings);
  const trainingSettingsOpen = useAppSelector((state) => state.cota.trainingSettingsOpen);

  // reset the form when the settings changes
  useEffect(() => {
    reset({
      ...trainingSettings,
    });
  }, [trainingSettings, reset]);

  // event handling
  const handleClose = () => {
    onCancel();
  };

  // form handling
  const handleUpdate: SubmitHandler<COTATrainingSettings> = (data) => {
    onUpdate(data);
  };
  const handleError: SubmitErrorHandler<COTATrainingSettings> = (data) => console.error(data);

  return (
    <Dialog open={trainingSettingsOpen} onClose={handleClose} fullWidth maxWidth="md">
      <form onSubmit={handleSubmit(handleUpdate, handleError)}>
        <DialogTitle>Advanced Training Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Divider>Search Space</Divider>
            <TextField
              label="Search Space Top K"
              fullWidth
              variant="outlined"
              key={`${cota.id}-search_space_topk`}
              {...register("search_space_topk", { required: "Search Space Top K is required" })}
              error={Boolean(errors.search_space_topk)}
              helperText={<ErrorMessage errors={errors} name="search_space_topk" />}
              InputLabelProps={{ shrink: true }}
              type="number"
              inputProps={{
                min: 10,
                max: 10000,
                step: 1,
              }}
            />

            <TextField
              label="Search Space Threshold"
              fullWidth
              variant="outlined"
              key={`${cota.id}-search_space_threshold`}
              {...register("search_space_threshold", { required: "Search Space Threshold is required" })}
              error={Boolean(errors.search_space_threshold)}
              helperText={<ErrorMessage errors={errors} name="search_space_threshold" />}
              InputLabelProps={{ shrink: true }}
              type="number"
              inputProps={{
                min: 0.01,
                max: 1,
                step: 0.01,
              }}
            />

            <Divider>Context Embedding Model</Divider>

            <TextField
              label="Num. feed forward layers"
              fullWidth
              variant="outlined"
              key={`${cota.id}-layers`}
              {...register("layers", {
                required: "Num. feed forward layers is required",
              })}
              error={Boolean(errors.layers)}
              helperText={<ErrorMessage errors={errors} name="layers" />}
              InputLabelProps={{ shrink: true }}
              type="number"
              inputProps={{
                min: 1,
                max: 10000,
                step: 1,
              }}
            />

            <TextField
              label="Dimensions of feed forward layers"
              fullWidth
              variant="outlined"
              key={`${cota.id}-dimensions`}
              {...register("dimensions", {
                required: "Dimensions of feed forward layers is required",
              })}
              error={Boolean(errors.dimensions)}
              helperText={<ErrorMessage errors={errors} name="dimensions" />}
              InputLabelProps={{ shrink: true }}
              type="number"
              inputProps={{
                min: 1,
                max: 10000,
                step: 1,
              }}
            />

            <Divider>Training</Divider>

            <TextField
              label="Epochs"
              fullWidth
              variant="outlined"
              key={`${cota.id}-epochs`}
              {...register("epochs", { required: "Epochs is required" })}
              error={Boolean(errors.epochs)}
              helperText={<ErrorMessage errors={errors} name="epochs" />}
              InputLabelProps={{ shrink: true }}
              type="number"
              inputProps={{
                min: 1,
                max: 100,
                step: 1,
              }}
            />

            <TextField
              label="Min. required annotations per concept"
              fullWidth
              variant="outlined"
              key={`${cota.id}-min_required_annotations_per_concept`}
              {...register("min_required_annotations_per_concept", {
                required: "Min. required annotations per concept is required",
              })}
              error={Boolean(errors.min_required_annotations_per_concept)}
              helperText={<ErrorMessage errors={errors} name="min_required_annotations_per_concept" />}
              InputLabelProps={{ shrink: true }}
              type="number"
              inputProps={{
                min: 1,
                max: 10000,
                step: 1,
              }}
            />

            <Divider>Other</Divider>

            <TextField
              key={`${cota.id}-${trainingSettings.dimensionality_reduction_algorithm}-dimensionality_reduction_algorithm`}
              select
              label="Dimensionality Reduction Algorithm"
              fullWidth
              variant="outlined"
              defaultValue={trainingSettings.dimensionality_reduction_algorithm}
              {...register("dimensionality_reduction_algorithm", {
                required: "Dimensionality Reduction Algorithm is required",
              })}
              error={Boolean(errors.dimensionality_reduction_algorithm)}
              helperText={<ErrorMessage errors={errors} name="dimensionality_reduction_algorithm" />}
              InputLabelProps={{ shrink: true }}
            >
              {Object.values(DimensionalityReductionAlgorithm).map((value) => (
                <MenuItem key={value} value={value}>
                  {value.toLocaleUpperCase()}
                </MenuItem>
              ))}
            </TextField>
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

export default CotaTrainingSettings;
