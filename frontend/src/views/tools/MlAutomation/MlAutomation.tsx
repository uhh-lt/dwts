import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import NotStartedIcon from "@mui/icons-material/NotStarted";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid2,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemText,
  Portal,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useContext, useState } from "react";
import { useParams } from "react-router-dom";
import MLHooks from "../../../api/MLHooks.ts";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { MLJobRead } from "../../../api/openapi/models/MLJobRead.ts";
import { MLJobType } from "../../../api/openapi/models/MLJobType.ts";
import NoSidebarLayout from "../../../layouts/NoSidebarLayout.tsx";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
function MlAutomation() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  const [currentJobId, setCurrentJobId] = useState<string | undefined>(undefined);

  // actions
  const startMlJob = MLHooks.useStartMLJob();
  const pollMlJob = MLHooks.usePollMLJob(currentJobId, undefined);

  const handleQuotationDetectionStarted = (data: MLJobRead) => {
    setCurrentJobId(data.id);
  };

  const handleStartQuotationDetection = (recompute: boolean = false) => {
    startMlJob.mutate(
      {
        requestBody: {
          ml_job_type: MLJobType.QUOTATION_ATTRIBUTION,
          project_id: projectId,
          specific_ml_job_parameters: { recompute: recompute, ml_job_type: MLJobType.QUOTATION_ATTRIBUTION },
        },
      },
      { onSuccess: handleQuotationDetectionStarted },
    );
  };

  // confirm dialog
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <NoSidebarLayout>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" component="div">
          Tools
        </Typography>
      </Portal>
      <Card sx={{ minHeight: "225.5px" }} elevation={2} className="myFlexFillAllContainer myFlexContainer">
        <CardHeader
          title="ML Automations"
          subheader="Start one or more of the following machine learning automations to speed up your work an enable new analysis options"
        />
        <CardContent style={{ padding: 0 }}>
          <Grid2 container>
            <Grid2 size={6}>
              <List dense={false}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <FormatQuoteIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Quotation detection"
                    secondary={"Detect who says what to whom and create corresponding span annotations"}
                  />
                  <ListItemIcon>
                    <Tooltip title="Perform quotation detection on all unprocessed documents">
                      <IconButton
                        onClick={() => handleStartQuotationDetection(false)}
                        loading={
                          startMlJob.isPending ||
                          pollMlJob.data?.status == BackgroundJobStatus.RUNNING ||
                          pollMlJob.data?.status == BackgroundJobStatus.WAITING
                        }
                        color="success"
                      >
                        <NotStartedIcon />
                      </IconButton>
                    </Tooltip>
                    <React.Fragment>
                      <Tooltip title="Re-compute all documents by deleting all previous automatic quote annotations">
                        <IconButton
                          onClick={handleClickOpen}
                          loading={
                            startMlJob.isPending ||
                            pollMlJob.data?.status == BackgroundJobStatus.RUNNING ||
                            pollMlJob.data?.status == BackgroundJobStatus.WAITING
                          }
                          color="error"
                        >
                          <RestartAltIcon />
                        </IconButton>
                      </Tooltip>
                      <Dialog
                        open={open}
                        onClose={handleClose}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                      >
                        <DialogTitle id="alert-dialog-title">{"Potential dataloss ahead! Are you sure?"}</DialogTitle>
                        <DialogContent>
                          <DialogContentText id="alert-dialog-description">
                            Remove all automatic quotation annotations including any manually created, linked data such
                            as memos?
                          </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                          <Button onClick={handleClose} variant="outlined">
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              handleStartQuotationDetection(true);
                              handleClose();
                            }}
                            color="error"
                            variant="contained"
                          >
                            Delete & re-compute
                          </Button>
                        </DialogActions>
                      </Dialog>
                    </React.Fragment>
                  </ListItemIcon>
                </ListItem>
                ,
              </List>
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>
    </NoSidebarLayout>
  );
}

export default MlAutomation;
