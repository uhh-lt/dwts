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
          to={"timeline"}
          title={"Timeline Analysis"}
          description={"Analyse the occurrence of concepts over time."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"span-annotations"}
          title={"Span Annotation Table"}
          description={"View, search, edit span annotations in a table."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"sentence-annotations"}
          title={"Sentence Annotation Table"}
          description={"View, search, edit sentence annotations in a table."}
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
          to={"annotation-scaling"}
          title={"Annotation Scaling"}
          description={"Semi-automatically scale annotations"}
          color={"#77dd77"}
        />
      </Box>
    </NoSidebarLayout>
  );
}

export default Analysis;
