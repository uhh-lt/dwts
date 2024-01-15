import TimelineIcon from "@mui/icons-material/Timeline";
import { Card, CardContent, CardHeader, IconButton, Typography } from "@mui/material";
import React, { useMemo } from "react";
import {
  CartesianGrid,
  Tooltip as ChartTooltip,
  Dot,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { COTARead, COTASentence } from "../../../api/openapi";

interface ConceptTimelinePlotProps {
  cota: COTARead;
}

function ConceptTimelinePlot({ cota }: ConceptTimelinePlotProps) {
  // computed
  const chartData = useMemo(() => {
    let result: Record<string, COTASentence[]> = {};
    cota.concepts.forEach((concept) => {
      result[concept.id] = [];
    });
    result["NO_CONCEPT"] = [];

    cota.search_space.forEach((cotaSentence) => {
      if (cotaSentence.concept_annotation) {
        result[cotaSentence.concept_annotation].push(cotaSentence);
      } else {
        result["NO_CONCEPT"].push(cotaSentence);
      }
    });

    console.log(result);
    return result;
  }, [cota]);

  // render
  let content: React.ReactNode;
  if (cota.concepts.length === 0) {
    content = (
      <Typography>Please add a concept to start the analysis (or make at least one concept visible).</Typography>
    );
  } else {
    content = (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis dataKey={"date"} />
          <YAxis />
          <CartesianGrid stroke="#eee" />
          <ChartTooltip />
          {concepts.map((concept) => (
            <Line
              key={concept.name}
              dataKey={concept.name}
              stroke={concept.color}
              dot={(props) => (
                <CustomizedDot
                  {...props}
                  isSelected={provenanceConcept === concept.name && provenanceDate === props.payload.date}
                />
              )}
              activeDot={(props) => (
                <CustomizedDot
                  {...props}
                  r={5}
                  stroke={concept.color}
                  isSelected={provenanceConcept === concept.name && provenanceDate === props.payload.date}
                  onClick={() => handleClick(props.payload.date, concept.name)}
                />
              )}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton>
            <TimelineIcon />
          </IconButton>
        }
        title={"Timeline Analysis"}
        subheader={`Click on a dot to see more information.`}
      />
      <CardContent className="myFlexFillAllContainer">{content}</CardContent>
    </Card>
  );
}

export default ConceptTimelinePlot;

const CustomizedDot = (props: any) => {
  const { cx, cy, stroke, r, isSelected, onClick } = props;

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={isSelected ? 2 * r : r}
      stroke={isSelected ? "black" : undefined}
      strokeWidth={isSelected ? 2 : undefined}
      fill={stroke}
      onClick={onClick ? () => onClick() : undefined}
    />
  );
};
