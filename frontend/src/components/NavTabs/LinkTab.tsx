import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import { NavActions } from "./navigationSlice";
import { IconButton, Tab } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

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
  labeltext?: string;
  href?: string;
  selected?: boolean;
  value?: string;
  icon?: string | React.ReactElement<any, string | React.JSXElementConstructor<any>> | undefined;
  disabletab?: string | undefined;
  onClick?: React.MouseEventHandler<HTMLAnchorElement> | undefined;
}

export default function LinkTab(props: LinkTabProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleClose = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    event.stopPropagation();
    event.preventDefault();
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
        label={
          <span
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {props.labeltext}
            {props.href !== "/projects" ? (
              <IconButton size="small" component="span" onClick={handleClose}>
                <CloseIcon
                  fontSize="small"
                  sx={{
                    "&:hover": { color: "darkred" },

                    color: "black",
                  }}
                />
              </IconButton>
            ) : (
              <></>
            )}
          </span>
        }
        component="a"
        value={props.value}
        onClick={props.labeltext === "newtab" ? props.onClick : handleTabClick}
        aria-current={props.selected && "page"}
        sx={{
          justifyContent: "start",
          backgroundColor: props.href === "#" ? "#DDDDDD" : "#DDDDDD",
          border: "1",

          width: props.href === "#" ? "0.1em" : "18em",
          minHeight: "3em",
          "&:hover": { backgroundColor: "#eeeeee", color: "#1976d2" },
          "&.Mui-selected": {
            fontWeight: 900,
            backgroundColor: "white",
          },
          minWidth: props.href !== "/projects" ? (props.href === "#" ? "0.1em" : "15em") : "9em",
          overflow: "hidden",

          height: "48px",
        }}
        icon={props.icon}
        iconPosition={props.href !== "/projects" ? "start" : "start"}
        disabled={props.disabletab === "true" ? true : false}
        {...props}
      />
    </>
  );
}
