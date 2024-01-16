import InfoIcon from "@mui/icons-material/Info";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ReplayIcon from "@mui/icons-material/Replay";
import FastForwardIcon from "@mui/icons-material/FastForward";
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { useEffect } from "react";
import CotaHooks from "../../../api/CotaHooks";
import { QueryKey } from "../../../api/QueryKey";
import { BackgroundJobStatus, COTARead } from "../../../api/openapi";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import queryClient from "../../../plugins/ReactQueryClient";
import BackgroundJobStatusIndicator from "./BackgroundJobStatusIndicator";
import {
  MIN_ANNOTATIONS_PER_CONCEPT,
  conceptsWithUnsufficientAnnotations,
  hasConceptsWithDescription,
  hasEnoughAnnotations,
} from "./cotaUtils";

interface CotaControlProps {
  cota: COTARead;
}

function CotaControl({ cota }: CotaControlProps) {
  // global server state (react-query)
  const refinementJob = CotaHooks.usePollMostRecentRefinementJob(cota.id);

  // track the status of the refinement job and refetch cota once it is finished
  useEffect(() => {
    if (!refinementJob.data) return;
    if (refinementJob.data.status === BackgroundJobStatus.FINISHED) {
      queryClient.invalidateQueries([QueryKey.COTA, refinementJob.data.cota.id]);
    }
  }, [refinementJob.data]);

  // actions
  const refineCota = CotaHooks.useRefineCota();
  const handleRefineCota = () => {
    refineCota.mutate(
      {
        cotaId: cota.id,
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Refining CotA '${data.cota.name}', Job ID: '${data.id}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const resetCota = CotaHooks.useResetCota();
  const handleResetCota = () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to reset the analysis "${cota.name}"? This action cannot be undone! It will reset the search space and delete all sentence annotations.`,
      onAccept: () => {
        resetCota.mutate(
          {
            cotaId: cota.id,
          },
          {
            onSuccess(data, variables, context) {
              SnackbarAPI.openSnackbar({
                text: `Resetted CotA '${data.name}'`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  };

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title="Controls"
        subheader="Do stuff here"
      />
      <CardContent className="myFlexFillAllContainer">
        {cota.concepts.length === 0 ? (
          <Alert variant="outlined" severity="warning">
            There are no concepts. To start the analysis, please add some concepts first.
          </Alert>
        ) : !hasConceptsWithDescription(cota) ? (
          <Alert variant="outlined" severity="warning">
            There are concepts without a description. To start the analysis, please add a description to all concepts.
          </Alert>
        ) : !cota.settings.date_metadata_id ? (
          <Alert variant="outlined" severity="warning">
            Date cannot be determined. To start the analysis, please select a date metadata.
          </Alert>
        ) : cota.search_space.length > 0 && !hasEnoughAnnotations(cota) ? (
          <Alert variant="outlined" severity="warning">
            The following concepts have not enough annotations (min. {MIN_ANNOTATIONS_PER_CONCEPT}) for refinement:{" "}
            {conceptsWithUnsufficientAnnotations(cota).join(", ")}. To refine the analysis, please annotate more
            sentences.
          </Alert>
        ) : null}

        <List sx={{ width: "100%", bgcolor: "background.paper" }}>
          {cota.search_space.length > 0 ? (
            <ListItemButton onClick={handleRefineCota} disabled={!hasEnoughAnnotations(cota)}>
              <ListItemIcon>
                <FastForwardIcon />
              </ListItemIcon>
              <ListItemText primary="Refine" />
            </ListItemButton>
          ) : (
            <ListItemButton
              onClick={handleRefineCota}
              disabled={!hasConceptsWithDescription(cota) || !cota.settings.date_metadata_id}
            >
              <ListItemIcon>
                <PlayArrowIcon />
              </ListItemIcon>
              <ListItemText primary="Start" />
            </ListItemButton>
          )}
          <ListItemButton onClick={handleResetCota} disabled={cota.search_space.length === 0}>
            <ListItemIcon>
              <ReplayIcon />
            </ListItemIcon>
            <ListItemText primary="Reset" />
          </ListItemButton>
        </List>

        {refinementJob.isSuccess ? (
          <BackgroundJobStatusIndicator
            status={refinementJob.data?.status}
            infoText={
              refinementJob.data?.current_pipeline_step === "None"
                ? undefined
                : refinementJob.data?.current_pipeline_step
            }
          />
        ) : refinementJob.isLoading ? (
          <Typography>Refinement Job: Loading...</Typography>
        ) : refinementJob.isError ? (
          <Typography>Refinement Job: Error while polling the job :(</Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default CotaControl;
