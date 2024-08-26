import { Box, Portal, Typography } from "@mui/material";
import { useContext } from "react";
import NoSidebarLayout from "../../layouts/NoSidebarLayout.tsx";
import { AppBarContext } from "../../layouts/TwoBarLayout.tsx";
import AnalysisCard from "./AnalysisCard.tsx";

function Analysis() {
  // global client state (context)
  const appBarContainerRef = useContext(AppBarContext);

  return (
    <NoSidebarLayout>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Analysis
        </Typography>
      </Portal>
      <Box display="flex" gap={2} flexWrap="wrap">
        <AnalysisCard
          to={"frequency"}
          title={"Code Frequency Analysis"}
          description={"Analyse the frequencies and occurrences of all codes in this project."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"code-graph"}
          title={"Code Graph"}
          description={"Tree view of all the codes in the project."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"timeline"}
          title={"Timeline Analysis"}
          description={"Analyse the occurrence of concepts over time."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"annotated-segments"}
          title={"Annotated Segments"}
          description={"View, search, edit all coded segments."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"word-frequency"}
          title={"Word Frequency Analysis"}
          description={"Analyse the frequencies and occurrences of all words in this project."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"concepts-over-time-analysis"}
          title={"Concepts Over Time Analysis"}
          description={"Analyse concepts overr time."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"entity-dashboard"}
          title={"Entity Dashboard"}
          description={"See and edit entities."}
          color={"#77dd77"}
        />

        <AnalysisCard to={"table"} title={"Table"} description={"Analyse with tables."} color={"#77dd77"} />
      </Box>
    </NoSidebarLayout>
  );
}

export default Analysis;
