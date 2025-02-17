import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import eventBus from "../../EventBus.ts";
import ExporterHooks from "../../api/ExporterHooks.ts";

import UserHooks from "../../api/UserHooks.ts";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import { ExportFormat } from "../../api/openapi/models/ExportFormat.ts";
import { ExportJobParameters } from "../../api/openapi/models/ExportJobParameters.ts";
import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { SingleDocAllUserAnnotationsExportJobParams } from "../../api/openapi/models/SingleDocAllUserAnnotationsExportJobParams.ts";
import { SingleDocSingleUserAnnotationsExportJobParams } from "../../api/openapi/models/SingleDocSingleUserAnnotationsExportJobParams.ts";
import { SingleProjectAllCodesExportJobParams } from "../../api/openapi/models/SingleProjectAllCodesExportJobParams.ts";
import { SingleProjectAllDataExportJobParams } from "../../api/openapi/models/SingleProjectAllDataExportJobParams.ts";
import { SingleProjectAllTagsExportJobParams } from "../../api/openapi/models/SingleProjectAllTagsExportJobParams.ts";
import { SingleUserAllMemosExportJobParams } from "../../api/openapi/models/SingleUserAllMemosExportJobParams.ts";
import { SingleUserLogbookExportJobParams } from "../../api/openapi/models/SingleUserLogbookExportJobParams.ts";
import { useAuth } from "../../auth/useAuth.ts";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import { downloadFile } from "../../utils/ExportUtils.ts";
import UserName from "../User/UserName.tsx";
import ExporterItemSelectList from "./ExporterItemSelectList.tsx";

// users documents codes tags attached_to
const enabledComponentsPerType = new Map<string, string[]>(
  Object.entries({
    Project: [],
    Tagset: [],
    Codeset: [],
    Memos: ["users"],
    Logbook: ["users"],
    Annotations: ["singleUser"],
  }),
);
const componentIsDisabled = (type: string, component: string): boolean => {
  if (enabledComponentsPerType.has(type)) {
    return enabledComponentsPerType.get(type)!.indexOf(component) === -1;
  }
  return true;
};

export interface ExporterInfo {
  type: "Project" | "Tagset" | "Codeset" | "Memos" | "Logbook" | "Annotations";
  users: number[];
  singleUser: boolean;
  sdocId: number;
}

const exporterInfoToExporterJobParameters = (exporterData: ExporterInfo, projectId: number): ExportJobParameters => {
  switch (exporterData.type) {
    case "Project":
      return {
        export_job_type: ExportJobType.SINGLE_PROJECT_ALL_DATA,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_PROJECT_ALL_DATA,
        } as SingleProjectAllDataExportJobParams,
        export_format: ExportFormat.CSV,
      };
    case "Tagset":
      return {
        export_job_type: ExportJobType.SINGLE_PROJECT_ALL_TAGS,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_PROJECT_ALL_TAGS,
        } as SingleProjectAllTagsExportJobParams,
        export_format: ExportFormat.CSV,
      };
    case "Codeset":
      return {
        export_job_type: ExportJobType.SINGLE_PROJECT_ALL_CODES,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_PROJECT_ALL_CODES,
        } as SingleProjectAllCodesExportJobParams,
        export_format: ExportFormat.CSV,
      };
    case "Memos":
      return {
        export_job_type: ExportJobType.SINGLE_USER_ALL_MEMOS,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_USER_ALL_MEMOS,
          user_id: exporterData.users[0],
        } as SingleUserAllMemosExportJobParams,
        export_format: ExportFormat.CSV,
      };
    case "Logbook":
      return {
        export_job_type: ExportJobType.SINGLE_USER_LOGBOOK,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_USER_LOGBOOK,
          user_id: exporterData.users[0],
        } as SingleUserLogbookExportJobParams,
        export_format: ExportFormat.CSV,
      };
    case "Annotations":
      if (exporterData.singleUser) {
        return {
          export_job_type: ExportJobType.SINGLE_DOC_SINGLE_USER_ANNOTATIONS,
          specific_export_job_parameters: {
            project_id: projectId,
            export_job_type: ExportJobType.SINGLE_DOC_SINGLE_USER_ANNOTATIONS,
            sdoc_id: exporterData.sdocId,
            user_id: exporterData.users[0],
          } as SingleDocSingleUserAnnotationsExportJobParams,
          export_format: ExportFormat.CSV,
        };
      } else {
        return {
          export_job_type: ExportJobType.SINGLE_DOC_ALL_USER_ANNOTATIONS,
          specific_export_job_parameters: {
            project_id: projectId,
            export_job_type: ExportJobType.SINGLE_DOC_ALL_USER_ANNOTATIONS,
            sdoc_id: exporterData.sdocId,
          } as SingleDocAllUserAnnotationsExportJobParams,
          export_format: ExportFormat.CSV,
        };
      }
  }
};

function ExporterDialog() {
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // local state
  const [open, setOpen] = useState(false);
  const [exporterData, setExporterData] = useState<ExporterInfo>({
    type: "Project",
    users: [],
    singleUser: false,
    sdocId: -1,
  });

  // global state (react-query)
  const startExport = ExporterHooks.useStartExportJob();
  const exportJob = ExporterHooks.usePollExportJob(startExport.data?.id);
  const { user } = useAuth();
  const projectUsers = UserHooks.useGetAllUsers();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  const handleClick = () => {
    const requestBody = exporterInfoToExporterJobParameters(exporterData, projectId);
    startExport.mutate(
      {
        requestBody,
      },
      {
        onSuccess: (exportJobRead) => {
          openSnackbar({
            text: `Created new export job ${exportJobRead.id}`,
            severity: "success",
          });
        },
      },
    );
  };

  // listen to open-memo event and open the dialog
  const openModal = useCallback(
    (event: CustomEventInit<ExporterInfo>) => {
      setOpen(true);
      const data = event.detail!;
      if (data.users.length !== 1 && user) {
        data.users = [user.id];
      }
      setExporterData(event.detail!);
    },
    [user],
  );

  useEffect(() => {
    if (!exportJob.data) return;
    if (exportJob.data.status) {
      if (exportJob.data.status === BackgroundJobStatus.FINISHED) {
        if (exportJob.data.results_url) {
          downloadFile(import.meta.env.VITE_APP_CONTENT + "/" + exportJob.data.results_url);
        }
        // Make sure the download doesn't start again on a re-render
        startExport.reset();
      } else if (exportJob.data.status === BackgroundJobStatus.ERRORNEOUS) {
        openSnackbar({
          text: `Export job ${exportJob.data.id} failed`,
          severity: "error",
        });
      }
    }
  }, [startExport, exportJob.data, openSnackbar]);

  useEffect(() => {
    eventBus.on("open-exporter", openModal);
    return () => {
      eventBus.remove("open-exporter", openModal);
    };
  }, [openModal]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setExporterData((oldData) => {
      return {
        ...oldData,
        type: (event.target as HTMLInputElement).value as
          | "Project"
          | "Tagset"
          | "Codeset"
          | "Memos"
          | "Logbook"
          | "Annotations",
      };
    });
  };

  const handleUsersChange = (selectedItems: number[]) => {
    setExporterData((oldData) => {
      return { ...oldData, users: selectedItems };
    });
  };

  const handleToggleSingleUser = () => {
    setExporterData((oldData) => {
      return { ...oldData, singleUser: !oldData.singleUser };
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Export</DialogTitle>
      <DialogContent>
        <Accordion elevation={0} variant="outlined">
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ width: "33%", flexShrink: 0 }}>Type</Typography>
            <Typography sx={{ color: (theme) => theme.palette.text.secondary }}>
              You want to export the {exporterData.type}
              {enabledComponentsPerType.get(exporterData.type)!.length > 0 ? "..." : "."}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <RadioGroup name="export-type-group" value={exporterData.type} onChange={handleTypeChange} row>
              {Array.from(enabledComponentsPerType.keys()).map((type) => (
                <FormControlLabel
                  key={type}
                  value={type}
                  control={<Radio />}
                  label={type}
                  disabled={type === "Annotations" && exporterData.sdocId === -1}
                />
              ))}
            </RadioGroup>
          </AccordionDetails>
        </Accordion>
        {!componentIsDisabled(exporterData.type, "users") && (
          <Accordion elevation={0} variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ width: "33%", flexShrink: 0 }}>User</Typography>
              <Typography sx={{ color: (theme) => theme.palette.text.secondary }}>
                ... of {exporterData.users.length > 0 ? <UserName userId={exporterData.users[0]} /> : "no user"}.
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ExporterItemSelectList
                items={
                  projectUsers.data?.map((user) => {
                    return {
                      id: user.id,
                      description: `${user.first_name} ${user.last_name}`,
                    };
                  }) || []
                }
                value={exporterData.users}
                onChange={handleUsersChange}
                itemsPerPage={5}
                singleSelect={true}
              />
            </AccordionDetails>
          </Accordion>
        )}
        {!componentIsDisabled(exporterData.type, "singleUser") && (
          <Accordion elevation={0} variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ width: "33%", flexShrink: 0 }}>User</Typography>
              <Typography sx={{ color: (theme) => theme.palette.text.secondary }}>
                ... of {exporterData.singleUser ? <UserName userId={exporterData.users[0]} /> : "all users"}.
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ToggleButtonGroup
                sx={{ ml: 2, mb: 1 }}
                color="primary"
                value={exporterData.singleUser}
                onClick={handleToggleSingleUser}
              >
                <ToggleButton value={true}>Single User</ToggleButton>
                <ToggleButton value={false}>All Users</ToggleButton>
              </ToggleButtonGroup>
              {exporterData.singleUser && (
                <ExporterItemSelectList
                  items={
                    projectUsers.data?.map((user) => {
                      return {
                        id: user.id,
                        description: `${user.first_name} ${user.last_name}`,
                      };
                    }) || []
                  }
                  value={exporterData.users}
                  onChange={handleUsersChange}
                  itemsPerPage={5}
                  singleSelect={true}
                />
              )}
            </AccordionDetails>
          </Accordion>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <LoadingButton
          loading={startExport.isPending || exportJob.data?.status === BackgroundJobStatus.WAITING}
          loadingPosition="start"
          startIcon={<SaveIcon />}
          variant="outlined"
          onClick={handleClick}
        >
          Export data!
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default ExporterDialog;
