import React, { useContext } from "react";
import { Box, Container, Grid, Portal, Typography } from "@mui/material";
import AnalysisCard from "./AnalysisCard";
import { range } from "lodash";
import { AppBarContext } from "../../layouts/TwoBarLayout";

function Analysis() {
  // global client state (context)
  const appBarContainerRef = useContext(AppBarContext);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Analysis
        </Typography>
      </Portal>
      <Box className="h100" style={{ overflowY: "auto" }}>
        <Container maxWidth="lg" className="h100">
          <Grid container spacing={2} mt={0}>
            <Grid item>
              <AnalysisCard
                to={"frequency"}
                title={"Code Frequency Analysis"}
                description={"Analyse the frequencies and occurrences of all codes in this project."}
                color={"#77dd77"}
              />
            </Grid>

            <Grid item>
              <AnalysisCard
                to={"code-graph"}
                title={"Code Graph"}
                description={"Tree view of all the codes in the project."}
                color={"#77dd77"}
              />
            </Grid>

            <Grid item>
              <AnalysisCard
                to={"timeline"}
                title={"Timeline Analysis"}
                description={"Analyse the occurrence of concepts over time."}
                color={"#77dd77"}
              />
            </Grid>

            <Grid item>
              <AnalysisCard
                to={"annotated-segments"}
                title={"Annotated Segments"}
                description={"View, search, edit all coded segments."}
                color={"#77dd77"}
              />
            </Grid>

            <Grid item>
              <AnalysisCard
                to={"word-frequency"}
                title={"Word Frequency Analysis"}
                description={"Analyse the frequencies and occurrences of all words in this project."}
                color={"#77dd77"}
              />
            </Grid>

            <Grid item>
              <AnalysisCard
                to={"concepts-over-time-analysis"}
                title={"Concepts Over Time Analysis"}
                description={"Analyse concepts overr time."}
                color={"#77dd77"}
              />
            </Grid>

            <Grid item>
              <AnalysisCard
                to={"concepts-over-time-analysis"}
                title={"Concepts Over Time Analysis"}
                description={"Analyse concepts overr time."}
                color={"#77dd77"}
              />
            </Grid>

            <Grid item>
              <AnalysisCard to={"table"} title={"Table"} description={"Analyse with tables."} color={"#77dd77"} />
            </Grid>
            {range(0, 2).map((i) => (
              <Grid item key={i}>
                <AnalysisCard
                  to={""}
                  title={"Mock Analysis Feature"}
                  description="This Analysis Feature does not actually exist..."
                />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </>
  );
}

export default Analysis;
