import { Card, CardContent, CardHeader, Typography } from "@mui/material";
import { padStart } from "lodash";
import React, { useMemo } from "react";
import {
  CartesianGrid,
  Tooltip as ChartTooltip,
  Dot,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { COTARead, DateGroupBy } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { dateToLocaleDate } from "../../../utils/DateUtils";
import CotaPlotToggleButton from "./CotaPlotToggleButton";
import { CotaActions } from "./cotaSlice";

interface CotaTimelinePlotProps {
  cota: COTARead;
}

function CotaTimelinePlot({ cota }: CotaTimelinePlotProps) {
  // global client state
  const selectedConceptId = useAppSelector((state) => state.cota.selectedConceptId);
  const selectedDate = useAppSelector((state) => state.cota.selectedDate);
  const dispatch = useAppDispatch();

  // computed
  const chartData = useMemo(() => {
    if (cota.timeline_settings.threshold === undefined) return [];
    if (cota.timeline_settings.group_by === undefined) return [];

    let result: Record<string, any> = {};
    cota.search_space.forEach((cotaSentence) => {
      // prepare date
      const date = dateToLocaleDate(cotaSentence.date);
      let dateStr = "";
      switch (cota.timeline_settings.group_by) {
        case DateGroupBy.DAY:
          dateStr = date.getFullYear() + "-" + padStart(`${date.getMonth() + 1}`, 2, "0") + "-" + date.getDate();
          break;
        case DateGroupBy.MONTH:
          dateStr = date.getFullYear() + "-" + padStart(`${date.getMonth() + 1}`, 2, "0");
          break;
        case DateGroupBy.YEAR:
          dateStr = date.getFullYear().toString();
          break;
      }

      // init result
      if (result[dateStr] === undefined) {
        result[dateStr] = {};
        cota.concepts.forEach((concept) => {
          result[dateStr][concept.id] = 0;
        });
      }

      // count concept, if similartiy is above threshold
      Object.entries(cotaSentence.concept_probabilities).forEach(([conceptId, conceptProbability]) => {
        if (conceptProbability > cota.timeline_settings.threshold!) {
          result[dateStr][conceptId] += 1;
        }
      });
    });

    // convert result to array
    const resultList = Object.entries(result).map(([date, data]) => {
      return {
        date: date,
        ...data,
      };
    });

    // sort by date
    resultList.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return 0;
    });

    return resultList;
  }, [cota]);

  // event handlers
  const handleTimelineDotClick = (date: string, conceptId: string) => {
    dispatch(CotaActions.onTimelineDotClick({ date, conceptId }));
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
        <LineChart data={chartData}>
          <XAxis dataKey={"date"} />
          <YAxis />
          <CartesianGrid stroke="#eee" />
          <ChartTooltip />
          <Legend />
          {cota.concepts.map((concept) => (
            <Line
              key={concept.id}
              name={concept.name}
              dataKey={concept.id}
              stroke={concept.color}
              dot={(props) => (
                <CustomizedDot
                  {...props}
                  isSelected={selectedConceptId === concept.id && selectedDate === props.payload.date}
                />
              )}
              activeDot={(props) => (
                <CustomizedDot
                  {...props}
                  r={5}
                  stroke={concept.color}
                  isSelected={selectedConceptId === concept.id && selectedDate === props.payload.date}
                  onClick={() => handleTimelineDotClick(props.payload.date, concept.id)}
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
        action={<CotaPlotToggleButton />}
        title={"Timeline Analysis"}
        subheader={`Click on a dot to see more information.`}
      />
      <CardContent className="myFlexFillAllContainer">{content}</CardContent>
    </Card>
  );
}

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

export default CotaTimelinePlot;
