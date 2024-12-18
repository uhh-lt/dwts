import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import * as d3 from "d3";
import React, { useRef, useState } from "react";
import AnalysisHooks from "../../../api/AnalysisHooks.ts";

interface TopWordsProps {
  data: Record<string, { word: string; score: number }>[];
}

const TopWordsBarChart: React.FC<TopWordsProps> = ({ data }) => {
  // set various variables
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [currentTopic, setCurrentTopic] = useState(0);
  const [width, setWidth] = useState<number>(window.innerWidth);
  const ollamaResponse = AnalysisHooks.useReturnTopWordsOllama(currentTopic);

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

  const amountTopics = Object.keys(data[0]).length;
  const barHeight = 25;
  const marginTop = window.innerHeight * 0.05;
  const marginRight = window.innerWidth * 0.1;
  const marginBottom = window.innerHeight * 0.05;
  const marginLeft = window.innerWidth * 0.1;
  const height = Math.ceil((amountTopics + 0.1) * barHeight) + marginTop + marginBottom;

  // Create x-scale
  const x = d3
    .scaleLinear()
    .domain([0, currentMaxScore])
    .range([marginLeft, width - marginRight]);

  // Create y-scale
  const y = d3
    .scaleBand()
    .domain(d3.sort(Object.values(data[currentTopic]), (d) => -d.score).map((d) => d.word))
    .rangeRound([marginTop, height - marginBottom])
    .padding(0.1);

  // formatting for the value inside the bars
  const formatScore = d3.format(".5f");

  React.useEffect(() => {
    // handles a window resize which in turn resizes the charts width
    const handleResize = () => {
      setWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);

    // select the svg to add content
    const svg = d3.select(svgRef.current);

    // clear previous content
    svg.selectAll("*").remove();

    // set up the svg container
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    // setup bars
    svg
      .append("g")
      .attr("fill", "steelblue")
      .selectAll()
      .data(Object.values(data[currentTopic]))
      .join("rect")
      .attr("x", x(0))
      .attr("y", (d) => y(d.word) ?? 0)
      // - x(0) -> berücksichtigt leftMargin
      .attr("width", (d) => x(d.score) * 0.995 - x(0))
      .attr("height", y.bandwidth());

    // set title and place on top
    svg
      .append("g")
      .append("text")
      .attr("x", width / 2)
      .attr("y", marginTop * 0.7)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text(
        ollamaResponse.isLoading
          ? "Loading..."
          : "Top Words for the Topics: " + ollamaResponse.data![0]["umbrella_term"],
      );

    // set x-axis label
    svg
      .append("g")
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - marginBottom * 0.2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Score");

    // text/value inside the bar + position
    svg
      .append("g")
      .attr("fill", "white")
      .attr("text-anchor", "end")
      .selectAll()
      .data(Object.values(data[currentTopic]))
      .join("text")
      .attr("x", (d) => x(d.score) * 0.995)
      .attr("y", (d) => (y(d.word) ?? 0) + y.bandwidth() / 2)
      .style("font-size", "11px") // Customize font size
      .attr("dy", "0.35em")
      .attr("dx", -4)
      .text((d) => formatScore(d.score))
      // currently not necessary
      .call((text) =>
        text
          // change the right value of the smaller than check accordingly
          .filter((d) => x(d.score) - x(0) < 20) // in case of short bars where the value wont fit
          .attr("dx", +4)
          .attr("fill", "black")
          .attr("text-anchor", "start"),
      );

    // setup border
    svg
      .append("g")
      .append("rect")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    // setup x-axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).ticks(width / 200))
      .call((g) => g.select(".domain").remove()) // removes last tick
      .style("font-size", "12px");

    // setup y-axis
    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickSizeOuter(0))
      .style("font-size", "14px");

    // clean-up
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [
    currentTopic,
    data,
    formatScore,
    height,
    marginBottom,
    marginLeft,
    marginRight,
    marginTop,
    ollamaResponse.data,
    ollamaResponse.isLoading,
    width,
    x,
    y,
  ]);

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
