import { Box, Grid } from "@mui/material";
import { COTARead } from "../../../api/openapi";
import CotaConceptList from "./CotaConceptList";
import CotaScatterPlot from "./CotaScatterPlot";
import CotaSentenceAnnotator2 from "./CotaSentenceAnnotator";

interface CotaViewContentProps {
  cota: COTARead;
}

function CotaViewContent({ cota }: CotaViewContentProps) {
  return (
    <Grid container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
      <Grid item md={3} className="myFlexContainer h100">
        <Box className="myFlexFitContentContainer" sx={{ mb: 2 }}>
          Empty for now
        </Box>
        <Box className="myFlexFillAllContainerNoScroll">
          <CotaConceptList cota={cota} />
        </Box>
      </Grid>
      <Grid item md={9} className="h100">
        <Box style={{ height: "50%" }} sx={{ pb: 1 }}>
          <CotaScatterPlot cota={cota} />
        </Box>
        <Box style={{ height: "50%" }} sx={{ pt: 1 }}>
          <CotaSentenceAnnotator2 cota={cota} />
        </Box>
      </Grid>
    </Grid>
  );
}

export default CotaViewContent;
