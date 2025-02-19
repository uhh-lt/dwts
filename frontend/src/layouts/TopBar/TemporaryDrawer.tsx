import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import GavelIcon from "@mui/icons-material/Gavel";
import InfoIcon from "@mui/icons-material/Info";
import MenuIcon from "@mui/icons-material/Menu";
import StackedBarChartIcon from "@mui/icons-material/StackedBarChart";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from "@mui/material";
import React, { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { OpenAPI } from "../../api/openapi/core/OpenAPI.ts";
import { LoginStatus } from "../../auth/LoginStatus.ts";
import { useAuth } from "../../auth/useAuth.ts";
import ExporterListItemButton from "../../components/Exporter/ExporterListItemButton.tsx";
import ProjectSettingsListItemButton from "../../components/ProjectSettings/ProjectSettingsListItemButton.tsx";

type Anchor = "top" | "left" | "bottom" | "right";

export default function TemporaryDrawer() {
  const { loginStatus } = useAuth();
  const { projectId } = useParams() as { projectId: string | undefined };

  const [state, setState] = useState({
    top: false,
    left: false,
    bottom: false,
    right: false,
  });

  const toggleDrawer = (anchor: Anchor, open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === "keydown" &&
      ((event as React.KeyboardEvent).key === "Tab" || (event as React.KeyboardEvent).key === "Shift")
    ) {
      return;
    }

    setState({ ...state, [anchor]: open });
  };

  const list = (anchor: Anchor) => (
    <Box
      sx={{ width: anchor === "top" || anchor === "bottom" ? "auto" : 250 }}
      role="presentation"
      onClick={toggleDrawer(anchor, false)}
      onKeyDown={toggleDrawer(anchor, false)}
      className="h100"
    >
      {projectId && (
        <>
          <List
            sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}
            subheader={<ListSubheader>Project</ListSubheader>}
          >
            <ProjectSettingsListItemButton />
          </List>

          <Divider />

          <List
            sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}
            subheader={<ListSubheader>Tools</ListSubheader>}
          >
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to={`/project/${projectId}/tools/ml-automation`}>
                <ListItemIcon>
                  <AutoAwesomeIcon />
                </ListItemIcon>
                <ListItemText primary="ML Automation" />
              </ListItemButton>
            </ListItem>

            <ExporterListItemButton />

            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to={`/project/${projectId}/tools/duplicate-finder`}>
                <ListItemIcon>
                  <FileCopyIcon />
                </ListItemIcon>
                <ListItemText primary="Duplicate Finder" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to={`/project/${projectId}/tools/document-sampler`}>
                <ListItemIcon>
                  <StackedBarChartIcon />
                </ListItemIcon>
                <ListItemText primary="Document Sampler" />
              </ListItemButton>
            </ListItem>
          </List>
        </>
      )}

      <Divider />

      <List
        sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}
        subheader={<ListSubheader>Links</ListSubheader>}
      >
        {loginStatus === LoginStatus.LOGGED_IN && (
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/projects">
              <ListItemIcon>
                <FactCheckIcon />
              </ListItemIcon>
              <ListItemText primary="Projects" />
            </ListItemButton>
          </ListItem>
        )}

        <ListItem disablePadding>
          <ListItemButton component={Link} href="https://github.com/uhh-lt/dats/wiki" target="_blank">
            <ListItemIcon>
              <AutoStoriesIcon />
            </ListItemIcon>
            <ListItemText primary="Wiki" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/about">
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="About" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/imprint">
            <ListItemIcon>
              <GavelIcon />
            </ListItemIcon>
            <ListItemText primary="Imprint" />
          </ListItemButton>
        </ListItem>
      </List>

      <ListItem sx={{ position: "absolute", bottom: 0 }}>
        <ListItemText primary={`Version ${OpenAPI.VERSION}`} />
      </ListItem>
    </Box>
  );

  return (
    <React.Fragment>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        sx={{ mr: 2 }}
        onClick={toggleDrawer("left", true)}
      >
        <MenuIcon />
      </IconButton>
      <Drawer anchor="left" open={state["left"]} onClose={toggleDrawer("left", false)}>
        {list("left")}
      </Drawer>
    </React.Fragment>
  );
}
