import * as React from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import BarChartIcon from "@mui/icons-material/BarChart";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BookIcon from "@mui/icons-material/Book";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import SearchIcon from "@mui/icons-material/Search";
import { MenuBook } from "@mui/icons-material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import UserHooks from "../../api/UserHooks";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";

interface NewTabMenuProps {
  anchorEl: HTMLAnchorElement | null;
  setAnchorEl: React.Dispatch<React.SetStateAction<HTMLAnchorElement | null>>;
}

function calculateValue(path: string) {
  if (path.match(/project\/\d+\/search.*/i)) {
    return 0;
  } else if (path.match(/project\/\d+\/annotation.*/i)) {
    return 1;
  } else if (path.match(/project\/\d+\/analysis.*/i)) {
    return 2;
  } else if (path.match(/project\/\d+\/whiteboard.*/i)) {
    return 3;
  } else if (path.match(/project\/\d+\/logbook.*/i)) {
    return 4;
  } else if (path.match(/project\/\d+\/autologbook.*/i)) {
    return 5;
  }
}
export default function NewTabMenu({ anchorEl, setAnchorEl }: NewTabMenuProps) {
  // Navigation logic for search pages
  const location = useLocation();
  let { projectId } = useParams();
  const value = calculateValue(location.pathname);

  const [searchPage, setSearchPage] = React.useState("search");
  const [annotationPage, setAnnotationPage] = React.useState("annotation");

  // store the current page in the local state
  React.useEffect(() => {
    if (value === 0) {
      setSearchPage("search" + location.pathname.split("/search")[1]);
    }
    if (value === 1) {
      setAnnotationPage("annotation" + location.pathname.split("/annotation")[1]);
    }
  }, [location, value]);

  //Navigation logic for projects pages
  const { user } = useAuth();
  const projects = UserHooks.useGetProjects(user?.id);

  //Navigation
  const open = Boolean(anchorEl);

  const navigate = useNavigate();

  const handleClose = (event: React.MouseEvent<JSX.Element | HTMLAnchorElement | HTMLDivElement | HTMLLIElement>) => {
    setAnchorEl(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLAnchorElement | HTMLDivElement | HTMLLIElement>) => {
    if (event.currentTarget.getAttribute("href") !== null)
      navigate(("../" + event.currentTarget.getAttribute("href")) as string);
    setAnchorEl(null);
  };

  const level0PathsRegEx = "/projects|/projectsettings|/settings|/about|/imprint|/me|/feedback.*";

  return (
    <React.Fragment>
      {location.pathname.match(level0PathsRegEx) !== null ? (
        <Menu
          anchorEl={anchorEl}
          id="menu"
          open={open}
          onClose={handleClose}
          onClick={handleMenuClick}
          slotProps={{
            paper: {
              elevation: 0,
              sx: {
                overflow: "visible",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                mt: 1.5,
                "& .MuiAvatar-root": {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                "&::before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: "background.paper",
                  transform: "translateY(-50%) rotate(45deg)",
                  zIndex: 0,
                },
              },
            },
          }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <MenuItem href={`/projectsettings`} onClick={handleMenuClick}>
            <ListItemIcon>
              <NoteAddOutlinedIcon />
            </ListItemIcon>
            New Project
          </MenuItem>
          {projects.isLoading && <div>Loading!</div>}
          {projects.isError && <div>Error: {projects.error.message}</div>}
          {projects.isSuccess &&
            projects.data.map((project) => (
              <MenuItem key={project.id} href={`/project/${project.id}/${searchPage}`} onClick={handleMenuClick}>
                <ListItemIcon>
                  <SearchIcon />
                </ListItemIcon>
                Open Project {project.id}
              </MenuItem>
            ))}
        </Menu>
      ) : (
        <Menu
          anchorEl={anchorEl}
          id="menu"
          open={open}
          onClose={handleClose}
          onClick={handleClose}
          slotProps={{
            paper: {
              elevation: 0,
              sx: {
                overflow: "visible",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                mt: 1.5,
                "& .MuiAvatar-root": {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                "&::before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: "background.paper",
                  transform: "translateY(-50%) rotate(45deg)",
                  zIndex: 0,
                },
              },
            },
          }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <MenuItem href={`/project/${projectId}/${searchPage}`} onClick={handleMenuClick}>
            <ListItemIcon>
              <SearchIcon />
            </ListItemIcon>
            Search
          </MenuItem>
          <MenuItem href={`/project/${projectId}/${annotationPage}`} onClick={handleMenuClick}>
            <ListItemIcon>
              <FormatColorTextIcon />
            </ListItemIcon>
            Annotation
          </MenuItem>
          <MenuItem href={`/project/${projectId}/analysis`} onClick={handleMenuClick}>
            <ListItemIcon>
              <BarChartIcon />
            </ListItemIcon>
            Analysis
          </MenuItem>
          <MenuItem href={`/project/${projectId}/whiteboard`} onClick={handleMenuClick}>
            <ListItemIcon>
              <AccountTreeIcon />
            </ListItemIcon>
            Whiteboard
          </MenuItem>
          <MenuItem href={`/project/${projectId}/logbook`} onClick={handleMenuClick}>
            <ListItemIcon>
              <BookIcon />
            </ListItemIcon>
            Logbook
          </MenuItem>
          <MenuItem href={`/project/${projectId}/autologbook`} onClick={handleMenuClick}>
            <ListItemIcon>
              <MenuBook />
            </ListItemIcon>
            Autologbook
          </MenuItem>
        </Menu>
      )}
    </React.Fragment>
  );
}
