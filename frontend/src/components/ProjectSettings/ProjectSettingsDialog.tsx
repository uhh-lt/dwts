import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import { LoadingButton, TabContext } from "@mui/lab";
import TabPanel from "@mui/lab/TabPanel";
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Stack,
  Tabs,
  Typography,
} from "@mui/material";
import Tab from "@mui/material/Tab";
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import ConfirmationAPI from "../ConfirmationDialog/ConfirmationAPI.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";
import ProjectBackgroundTasks from "./backgroundtasks/ProjectBackgroundTasks.tsx";
import ProjectCodes from "./tabs/ProjectCodes.tsx";
import ProjectDetails from "./tabs/ProjectDetails.tsx";
import ProjectDocuments from "./tabs/ProjectDocuments.tsx";
import ProjectTags from "./tabs/ProjectTags.tsx";
import ProjectUsers from "./tabs/ProjectUsers.tsx";

function ProjectSettingsDialog() {
  const { projectId } = useParams() as { projectId: string };
  const projId = parseInt(projectId);

  // dialog state
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.dialog.isProjectSettingsOpen);
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeProjectSettings());
  };

  // queries
  const project = ProjectHooks.useGetProject(projId);

  // state
  const [tab, setTab] = useState("1");
  const handleChangeTab = (_event: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  };

  const navigate = useNavigate();
  const deleteProjectMutation = ProjectHooks.useDeleteProject();
  const handleClickRemoveProject = () => {
    if (project.data) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to delete the project "${project.data.title}"? This action cannot be undone and  will remove project and all of it's content including documents!`,
        onAccept: () => {
          deleteProjectMutation.mutate(
            { projId: project.data.id },
            {
              onSuccess: () => navigate(`/projects`),
            },
          );
        },
      });
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={(_, reason) => reason === "escapeKeyDown" && handleClose()}
      maxWidth="xl"
      fullWidth
      PaperProps={{ className: "h100 myFlexFillAllContainer" }}
    >
      <TabContext value={tab}>
        <AppBar position="relative" color="primary" className="myFlexFitContentContainer">
          <Stack direction="row" sx={{ px: 2, pt: 2 }}>
            <Typography variant="h6" component="div">
              {project.isSuccess ? project.data.title : "Project name"} - Settings
            </Typography>
          </Stack>
          <Tabs value={tab} onChange={handleChangeTab} variant="scrollable" textColor="inherit">
            <Tab label="Details" value="1" />
            <Tab label="Documents" value="2" />
            <Tab label="User" value="3" />
            <Tab label="Codes" value="4" />
            <Tab label="Tags" value="5" />
            <Tab label="Background Tasks" value="6" />
          </Tabs>
        </AppBar>
        {project.isLoading && <DialogContent>Loading project...</DialogContent>}
        {project.isError && <DialogContent>An error occurred while loading project {projectId}...</DialogContent>}
        {project.isSuccess && (
          <React.Fragment>
            <TabPanel value="1" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectDetails project={project.data} />
            </TabPanel>
            <TabPanel value="2" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectDocuments project={project.data} />
            </TabPanel>
            <TabPanel value="3" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectUsers project={project.data} />
            </TabPanel>
            <TabPanel value="4" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectCodes />
            </TabPanel>
            <TabPanel value="5" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectTags />
            </TabPanel>
            <TabPanel value="6" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectBackgroundTasks project={project.data} />
            </TabPanel>
          </React.Fragment>
        )}
        <Divider />
        <DialogActions>
          <LoadingButton
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ mr: 1 }}
            onClick={handleClickRemoveProject}
            disabled={!project.isSuccess}
            loading={deleteProjectMutation.isPending}
            loadingPosition="start"
          >
            Delete Project
          </LoadingButton>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" startIcon={<CloseIcon />} onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      </TabContext>
    </Dialog>
  );
}

export default ProjectSettingsDialog;
