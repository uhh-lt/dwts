import * as React from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useLocation, useNavigate } from "react-router-dom";
import { Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { NavActions } from "./navigationSlice";
import CancelIcon from "@mui/icons-material/Cancel";
import HomeIcon from "@mui/icons-material/Home";
import { TabContext } from "@mui/lab";

function samePageLinkNavigation(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
  if (
    event.defaultPrevented ||
    event.button !== 0 || // ignore everything but left-click
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  ) {
    return false;
  }
  return true;
}

interface LinkTabProps {
  label?: string;
  href?: string;
  selected?: boolean;
  navPaths?: string[];
  value?: string;
}

function LinkTab(props: LinkTabProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  // const navPaths = useAppSelector((state) => state.navTabs.navPaths);

  const handleClose = (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    event.stopPropagation();
    event.preventDefault();
    // console.log("handleClose", navPaths.at(0));
    navigate(props.navPaths?.at(0) as string, { replace: true });
    dispatch(NavActions.removeNavPath(props.href as string));
  };

  return (
    <>
      <Tab
        component="a"
        value={props.value}
        onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
          if (samePageLinkNavigation(event)) {
            event.preventDefault();
          }
          navigate(event.currentTarget.getAttribute("href") as string);
        }}
        aria-current={props.selected && "page"}
        sx={{
          backgroundColor: "white",
          border: "1",
          borderRadius: "1em",
          mr: 1,
          width: props.href !== "/projects" ? "15em" : "9em",
          minHeight: "3em",
          "&:hover": { backgroundColor: "#e3f2fd" },
          "&.Mui-selected": {
            fontWeight: 900,
          },
        }}
        icon={
          props.href !== "/projects" ? (
            <CancelIcon fontSize="small" onClick={handleClose} sx={{ "&:hover": { color: "darkred" } }} />
          ) : (
            <HomeIcon fontSize="small" />
          )
        }
        iconPosition={props.href !== "/projects" ? "end" : "start"}
        {...props}
      />
    </>
  );
}

export default function NavTabs() {
  const dispatch = useAppDispatch();
  const [value, setValue] = React.useState(0);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    // event.type can be equal to focus with selectionFollowsFocus.
    if (
      event.type !== "click" ||
      (event.type === "click" && samePageLinkNavigation(event as React.MouseEvent<HTMLAnchorElement, MouseEvent>))
    ) {
      // setValue(newValue);
    }
  };

  const location = useLocation();
  const navPaths = useAppSelector((state) => state.navTabs.navPaths);
  const navPathsSet = React.useMemo(() => Array.from(new Set(navPaths).values()), [navPaths]);

  React.useEffect(() => {
    if (navPathsSet.indexOf(location.pathname) === -1) {
      dispatch(NavActions.setNavPaths(location.pathname));
      // setValue(navPathsSet.length);
    }
    // console.log("NavPaths", navPathsSet);
    // console.log("NewValue", value);
  }, [dispatch, location, navPaths, navPathsSet, setValue, value]);

  return (
    <TabContext value={location.pathname}>
      <Box sx={{ width: "100%", flexGrow: 1 }}>
        <Typography variant="h5"></Typography>
        <Tabs
          value={location.pathname}
          onChange={handleChange}
          scrollButtons="auto"
          aria-label="scrollable auto tabs"
          role="navigation"
          variant="scrollable"
        >
          {navPathsSet.map((path) => (
            <LinkTab
              key={path}
              label={
                path.match("^.*/[0-9]+/[a-zA-Z]+$")
                  ? (path.match("^.*(/[0-9]+)/([a-zA-Z]+)$")?.at(2) || "") +
                    (path.match("^.*(/[0-9]+)/([a-zA-Z]+)$")?.at(1) || "")
                  : path.match("^.*/([a-zA-Z]+.*)$")?.at(1)
              }
              href={path}
              navPaths={navPaths}
              value={path}
            />
          ))}
        </Tabs>
      </Box>
    </TabContext>
  );
}
