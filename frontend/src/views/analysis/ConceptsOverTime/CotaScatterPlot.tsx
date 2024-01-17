import { Card, CardContent, CardHeader, Typography } from "@mui/material";
import React, { useMemo } from "react";
import {
  CartesianGrid,
  Dot,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COTARead, COTASentence } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import CotaPlotToggleButton from "./CotaPlotToggleButton";
import { CotaActions } from "./cotaSlice";

interface CotaScatterPlotProps {
  cota: COTARead;
}

function CotaScatterPlot({ cota }: CotaScatterPlotProps) {
  // redux
  const dispatch = useAppDispatch();
  const provenanceSdocIdSentenceId = useAppSelector((state) => state.cota.provenanceSdocIdSentenceId);

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

    return result;
  }, [cota]);

  // actions
  const handleDotClick = (sdocIdSentenceId: string) => {
    dispatch(CotaActions.onScatterPlotDotClick(sdocIdSentenceId));
  };

  // render
  let content: React.ReactNode;
  if (cota.concepts.length === 0) {
    content = (
      <Typography>Please add a concept to start the analysis (or make at least one concept visible).</Typography>
    );
  } else {
    content = (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          width={730}
          height={250}
          margin={{
            top: 20,
            right: 20,
            bottom: 10,
            left: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" type="number" name="x" />
          <YAxis dataKey="y" type="number" name="y" />
          <Tooltip content={<CotaScatterPlotTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Legend />
          {cota.concepts.map((concept) => (
            <Scatter
              key={concept.id}
              name={concept.name}
              data={chartData[concept.id]}
              fill={concept.color}
              isAnimationActive={false}
              shape={(props) => {
                console.log(props);
                return <rect />;
              }}
            />
          ))}
          <Scatter
            name="Unannotated Sentences"
            data={chartData["NO_CONCEPT"]}
            fill="#8884d8a8"
            isAnimationActive={false}
            shape={(props) => {
              const sdocIdSentenceId = `${props.sdoc_id}-${props.sentence_id}`;
              const isSelected = sdocIdSentenceId === provenanceSdocIdSentenceId;
              return (
                <Dot
                  cx={props.cx}
                  cy={props.cy}
                  fill={isSelected ? "#8884d8" : props.fill}
                  key={props.key}
                  r={isSelected ? 10 : 5}
                  stroke={isSelected ? "black" : undefined}
                  strokeWidth={isSelected ? 2 : undefined}
                  style={{
                    zIndex: isSelected ? 100 : undefined,
                  }}
                  onClick={() => handleDotClick(sdocIdSentenceId)}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        title={"Scatter Plot"}
        subheader={`Hover on a dot to see more information.`}
        action={<CotaPlotToggleButton />}
      />
      <CardContent className="myFlexFillAllContainer">{content}</CardContent>
    </Card>
  );
}

function CotaScatterPlotTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length && payload.length > 0) {
    const data: COTASentence = payload[0].payload;
    return (
      <Card>
        <CardContent>
          <Typography>Sentence: {data.sentence_id}</Typography>
          <Typography>Sdoc: {data.sdoc_id}</Typography>
          <Typography>Annotation: {data.concept_annotation || "None"}</Typography>
          {Object.entries(data.concept_similarities).map(([conceptId, similarity]) => {
            return (
              <Typography key={conceptId}>
                {conceptId}: {similarity}
              </Typography>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  return null;
}

export default CotaScatterPlot;
