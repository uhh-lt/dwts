import ScatterPlotIcon from "@mui/icons-material/ScatterPlot";
import TimelineIcon from "@mui/icons-material/Timeline";
import { Button, Tooltip } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { CotaActions } from "./cotaSlice";

function CotaPlotToggleButton() {
  // global client state (redux)
  const isTimelineView = useAppSelector((state) => state.cota.isTimelineView);
  const dispatch = useAppDispatch();

  const handleToggle = () => {
    dispatch(CotaActions.onToggleTimelineView());
  };

  return (
    <Tooltip title={isTimelineView ? "View the scatter plot" : "View the timeline analysis"}>
      <Button startIcon={isTimelineView ? <ScatterPlotIcon /> : <TimelineIcon />} onClick={handleToggle}>
        {isTimelineView ? "Show Scatter Plot" : "Show Timeline Analysis"}
      </Button>
    </Tooltip>
  );
}

export default CotaPlotToggleButton;
