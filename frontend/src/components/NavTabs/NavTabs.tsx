import * as React from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import { useLocation } from "react-router-dom";
import { Button, Stack } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { NavActions } from "./navigationSlice";
import NewTabMenu from "./NewTabMenu";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import LinkTab from "./LinkTab";
import InfoIcon from "@mui/icons-material/Info";
import GavelIcon from "@mui/icons-material/Gavel";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import SettingsIcon from "@mui/icons-material/Settings";
import { MenuBook } from "@mui/icons-material";
import BarChartIcon from "@mui/icons-material/BarChart";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BookIcon from "@mui/icons-material/Book";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import SearchIcon from "@mui/icons-material/Search";

export default function NavTabs() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navPaths = useAppSelector((state) => state.navTabs.navPaths);
  const setTabIcon = (path: string) => {
    let tabIcon = <></>;
    if (path.includes("projects")) {
      if (path.includes("projectsettings")) tabIcon = <SettingsIcon fontSize="small" />;
      else tabIcon = <FactCheckIcon fontSize="small" />;
    } else if (path.includes("search")) tabIcon = <SearchIcon fontSize="small" />;
    else if (path.includes("annotation")) tabIcon = <FormatColorTextIcon fontSize="small" />;
    else if (path.includes("analysis")) tabIcon = <BarChartIcon fontSize="small" />;
    else if (path.includes("whiteboard")) tabIcon = <AccountTreeIcon fontSize="small" />;
    else if (path.includes("logbook")) tabIcon = <BookIcon fontSize="small" />;
    else if (path.includes("autologbooks")) tabIcon = <MenuBook fontSize="small" />;
    else if (path.includes("settings")) tabIcon = <SettingsIcon fontSize="small" />;
    else if (path.includes("about")) tabIcon = <InfoIcon fontSize="small" />;
    else if (path.includes("imprint")) tabIcon = <GavelIcon fontSize="small" />;
    return tabIcon;
  };
  React.useEffect(() => {
    dispatch(NavActions.addNavPaths(location.pathname));
  }, [dispatch, location]);

  //New tab menu anchor
  const [anchorEl, setAnchorEl] = React.useState<HTMLAnchorElement | null>(null);

  const handleNewTabClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    setAnchorEl(event.currentTarget);
  };

  return (
    <Box sx={{ width: "100%", flexGrow: 1 }}>
      <Stack direction={"row"} spacing={1}>
        <Tabs
          value={navPaths.includes(location.pathname) ? location.pathname : false}
          scrollButtons="auto"
          aria-label="scrollable auto tabs"
          role="navigation"
          variant="scrollable"
          TabIndicatorProps={{
            sx: {
              top: 0,
            },
          }}
        >
          {navPaths.map((path) => (
            <LinkTab
              key={path}
              labeltext={
                path.match("^.*/[0-9]+/[a-zA-Z]+$")
                  ? (path.match("^.*(/[0-9]+)/([a-zA-Z]+)$")?.at(2) || "") +
                    (path.match("^.*(/[0-9]+)/([a-zA-Z]+)$")?.at(1) || "")
                  : path.match("^.*/([a-zA-Z]+.*)$")?.at(1)
              }
              href={path}
              value={path}
              icon={setTabIcon(path)}
            />
          ))}
        </Tabs>
        <Button
          endIcon={<AddCircleIcon fontSize="large" sx={{ width: 28, height: 28 }} />}
          href={"#"}
          onClick={handleNewTabClick}
          variant="text"
          color="inherit"
          sx={{ minWidth: "1rem", pl: 0, height: "3em", borderRadius: "5em" }}
        />
      </Stack>
      <NewTabMenu anchorEl={anchorEl} setAnchorEl={setAnchorEl} />
    </Box>
  );
}
