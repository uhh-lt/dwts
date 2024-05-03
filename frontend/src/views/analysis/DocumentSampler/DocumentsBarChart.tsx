import { CardProps } from "@mui/material";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { ChartDataPoint } from "./ChartDataPoint";
import DataCard from "./DataCard";
import { useCallback } from "react";

interface DocumentsBarChartProps {
  cardProps?: CardProps;
  onChartRefresh: () => void;
}

function DocumentsBarChart({ cardProps, onChartRefresh }: DocumentsBarChartProps) {
  const isFixedSamplingStrategy = useAppSelector((state) => state.documentSampler.isFixedSamplingStrategy);

  const renderChart = useCallback(
    (chartData: ChartDataPoint[]) => (
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <XAxis dataKey={(chartDatum: ChartDataPoint) => chartDatum.tags.map((tag) => tag.title).join(", ")} />
          <YAxis />
          <CartesianGrid stroke="#eee" />
          <Tooltip />
          <Legend />
          <Bar dataKey={(chartDatum: ChartDataPoint) => chartDatum.count} fill="#8884d8" name={"Documents"} />
          <Bar
            dataKey={(chartDatum: ChartDataPoint) =>
              isFixedSamplingStrategy ? chartDatum.fixedSampleCount : chartDatum.relativeSampleCount
            }
            fill="#ff84d8"
            name={isFixedSamplingStrategy ? "Fixed sampled documents" : "Relative sampled documents"}
          />
        </BarChart>
      </ResponsiveContainer>
    ),
    [isFixedSamplingStrategy],
  );

  return (
    <DataCard
      title="Document chart"
      description="Number of documents per group combination"
      onDataRefresh={onChartRefresh}
      cardProps={cardProps}
      renderData={renderChart}
    />
  );
}

export default DocumentsBarChart;
