import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import * as d3 from "d3";
import React, { useRef, useState } from "react";

interface TopWordsProps {
  data: Record<string, { word: string; score: number }>[];
}

const TopWordsBarChart: React.FC<TopWordsProps> = ({ data }) => {
  const amountTopics = Object.keys(data[0]).length;
  const [currentTopic, setCurrentTopic] = useState(0);
  // change to current topic so the scale changes accordingly
  let maxScore = 0;
  for (const topic of data) {
    for (const word in topic) {
      if (topic[word]["score"] > maxScore) {
        maxScore = topic[word]["score"];
      }
    }
  }
  let currentMaxScore = 0;
  for (const word in data[currentTopic]) {
    if (data[currentTopic][word]["score"] > currentMaxScore) {
      currentMaxScore = data[currentTopic][word]["score"];
    }
  }

  const barHeight = 25;
  const marginTop = 30;
  const marginRight = 0;
  const marginBottom = 10;
  const marginLeft = 30;
  const width = 928;
  const height = Math.ceil((amountTopics + 0.1) * barHeight) + marginTop + marginBottom;
  console.log(maxScore);
  // Create the scales.
  const x = d3
    .scaleLinear()
    .domain([0, currentMaxScore])
    .range([marginLeft, width - marginRight]);

  const y = d3
    .scaleBand()
    .domain(d3.sort(Object.values(data[currentTopic]), (d) => -d.score).map((d) => d.word))
    .rangeRound([marginTop, height - marginBottom])
    .padding(0.1);

  const formatScore = d3.format(".5f");
  const svgRef = useRef<SVGSVGElement | null>(null);

  React.useEffect(() => {
    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll("*").remove();

    // Set up the SVG container
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    svg
      .append("g")
      .attr("fill", "steelblue")
      .selectAll()
      .data(Object.values(data[currentTopic]))
      .join("rect")
      .attr("x", x(0))
      .attr("y", (d) => y(d.word) ?? 0)
      .attr("width", (d) => x(d.score) - x(0))
      .attr("height", y.bandwidth());

    svg
      .append("g")
      .attr("fill", "white")
      .attr("text-anchor", "end")
      .selectAll()
      .data(Object.values(data[currentTopic]))
      .join("text")
      .attr("x", (d) => x(d.score))
      .attr("y", (d) => y(d.word) ?? 0 + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("dx", -4)
      .text((d) => formatScore(d.score))
      .call((text) =>
        text
          .filter((d) => x(d.score) - x(0) < 20) // short bars
          .attr("dx", +4)
          .attr("fill", "black")
          .attr("text-anchor", "start"),
      );

    // Create the axes.
    svg
      .append("g")
      .attr("transform", `translate(0,${marginTop})`)
      .call(d3.axisTop(x).ticks(width / 80, "%"))
      .call((g) => g.select(".domain").remove());

    svg.append("g").attr("transform", `translate(${marginLeft},0)`).call(d3.axisLeft(y).tickSizeOuter(0));
  }, [currentTopic, data, formatScore, height, x, y]);

  const handleChange = (event: SelectChangeEvent<number>) => {
    setCurrentTopic(event.target.value as number);
  };

  return (
    <div>
      <FormControl fullWidth>
        <InputLabel id="dynamic-dropdown-label">Select Key</InputLabel>
        <Select labelId="dynamic-dropdown-label" value={currentTopic} onChange={handleChange}>
          {Object.keys(data[0]).map((key) => (
            <MenuItem key={key} value={key}>
              {key}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default TopWordsBarChart;
