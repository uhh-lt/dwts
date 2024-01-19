import { Box, Grid } from "@mui/material";
import { COTARead } from "../../../api/openapi";
import CotaConceptList from "./CotaConceptList";
import CotaScatterPlot from "./CotaScatterPlot";
import CotaSentenceAnnotator2 from "./CotaSentenceAnnotator";
import CotaControl from "./CotaControl";
import CotaTimelineSettings from "./CotaTimelineSettings";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import CotaTimelinePlot from "./CotaTimelinePlot";

interface CotaViewContentProps {
  cota: COTARead;
}

function CotaViewContent({ cota }: CotaViewContentProps) {
  // global client state (redux)
  const isTimelineView = useAppSelector((state) => state.cota.isTimelineView);

  return (
    <Grid container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
      <Grid item md={3} className="myFlexContainer h100">
        <Box className="myFlexFitContentContainer" sx={{ mb: 2 }}>
          <CotaControl cota={cota} />
        </Box>
        <Box className="myFlexFitContentContainer" sx={{ mb: 2 }}>
          <CotaTimelineSettings cota={cota} />
        </Box>
        <Box className="myFlexFillAllContainerNoScroll">
          <CotaConceptList cota={cota} />
        </Box>
      </Grid>
      <Grid item md={9} className="h100">
        <Box style={{ height: "50%" }} sx={{ pb: 1 }}>
          {isTimelineView ? <CotaTimelinePlot cota={cota} /> : <CotaScatterPlot cota={cota} />}
        </Box>
        <Box style={{ height: "50%" }} sx={{ pt: 1 }}>
          <CotaSentenceAnnotator2 cota={cota} />
        </Box>
      </Grid>
    </Grid>
  );
}

export default CotaViewContent;
