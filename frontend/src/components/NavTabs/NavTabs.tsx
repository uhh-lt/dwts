import * as React from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Stack } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { NavActions } from "./navigationSlice";
import CancelIcon from "@mui/icons-material/Cancel";
import HomeIcon from "@mui/icons-material/Home";
import NewTabMenu from "./NewTabMenu";
import AddCircleIcon from "@mui/icons-material/AddCircle";

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
  navpaths?: string[];
  value?: string;
  icon?: string | React.ReactElement<any, string | React.JSXElementConstructor<any>> | undefined;
  disabletab?: string | undefined;
  onClick?: React.MouseEventHandler<HTMLAnchorElement> | undefined;
}

function LinkTab(props: LinkTabProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  // const navPaths = useAppSelector((state) => state.navTabs.navPaths);

  const handleClose = (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    event.stopPropagation();
    event.preventDefault();
    // console.log("handleClose", navPaths.at(0));
    navigate("/projects", { replace: true });
    dispatch(NavActions.removeNavPath(props.href as string));
  };
  const handleTabClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (samePageLinkNavigation(event)) {
      event.preventDefault();
    }
    navigate(event.currentTarget.getAttribute("href") as string);
  };
  return (
    <>
      <Tab
        component="a"
        value={props.value}
        onClick={props.label === "newtab" ? props.onClick : handleTabClick}
        aria-current={props.selected && "page"}
        sx={{
          backgroundColor: props.href === "#" ? "#DDDDDD" : "white",
          border: "1",
          borderRadius: "0.2em",
          mr: 1,
          pl: 2,
          width: props.href !== "/projects" ? (props.href === "#" ? "0.1em" : "15em") : "9em",
          // fontSize: "0.8rem",
          minHeight: "3em",
          "&:hover": { backgroundColor: "#e3f2fd" },
          "&.Mui-selected": {
            fontWeight: 900,
          },
          minWidth: props.href !== "/projects" ? (props.href === "#" ? "0.1em" : "15em") : "9em",
          overflow: "hidden",
          // width: props.href === "#" ? "0.1em" : "inherit",
        }}
        icon={
          props.href !== "/projects" ? (
            <CancelIcon fontSize="small" onClick={handleClose} sx={{ "&:hover": { color: "darkred" } }} />
          ) : (
            <HomeIcon fontSize="small" />
          )
        }
        iconPosition={props.href !== "/projects" ? "end" : "start"}
        disabled={props.disabletab === "true" ? true : false}
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
    }
  };

  const location = useLocation();
  const navPaths = useAppSelector((state) => state.navTabs.navPaths);
  const navPathsSet = React.useMemo(() => Array.from(new Set(navPaths).values()), [navPaths]);
  const homeTab = React.useRef("/projects");
  React.useEffect(() => {
    console.log("NavPaths", navPathsSet, location.pathname, homeTab, location.pathname !== homeTab.current);
    if (navPathsSet.indexOf(location.pathname) === -1 && location.pathname !== homeTab.current) {
      dispatch(NavActions.setNavPaths(location.pathname));
    }
  }, [dispatch, location, navPaths, navPathsSet, setValue, value]);

  //New tab
  const [anchorEl, setAnchorEl] = React.useState<HTMLAnchorElement | null>(null);

  const handleNewTabClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    setAnchorEl(event.currentTarget);
  };

  return (
    <Box sx={{ width: "100%", flexGrow: 1 }}>
      <Stack direction={"row"} spacing={1}>
        <Button
          LinkComponent={"a"}
          startIcon={<HomeIcon fontSize="small" />}
          href={location.pathname !== homeTab.current ? homeTab.current : "#"}
          variant="text"
          sx={{
            minWidth: "10em",
            height: "3em",
            backgroundColor: "white",
            color: location.pathname !== homeTab.current ? "gray" : "primary.main",
            fontWeight: location.pathname === homeTab.current ? 900 : 500,
            "&:hover": { backgroundColor: "#e3f2fd" },
            "&.Mui-selected": {
              fontWeight: 900,
            },
          }}
        >
          Projects
        </Button>
        <Tabs
          value={navPathsSet.includes(location.pathname) ? location.pathname : false}
          onChange={handleChange}
          scrollButtons="auto"
          aria-label="scrollable auto tabs"
          role="navigation"
          variant="scrollable"
          // variant="fullWidth"
          // sx={{ maxWidth: "100em" }}
        >
          {/* <LinkTab
            key={homeTab.current}
            label={homeTab.current.substring(1)}
            href={homeTab.current}
            navpaths={navPathsSet}
            value={homeTab.current}
          /> */}

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
              navpaths={navPathsSet}
              value={path}
            />
          ))}

          {/* <LinkTab
          key={"newtab"}
          label={""}
          href={"#"}
          icon={<AddIcon fontSize="small" />}
          navpaths={navPathsSet}
          value={"#"}
          onClick={handleNewTabClick}
        /> */}
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
