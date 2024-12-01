import * as d3 from "d3";
import React, { useRef } from "react";

interface LinePlotData {
  data: { x: number; y: number }[];
}

const LinePlot: React.FC<LinePlotData> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const width = 960;
  const height = 450;
  const marginTop = 20;
  const marginRight = 20;
  const marginBottom = 30;
  const marginLeft = 40;

  // Calculate scales
  const minXValue = d3.min(data, (d) => d.x) ?? 0;
  const maxXValue = d3.max(data, (d) => d.x) ?? 1;
  const minYValue = d3.min(data, (d) => d.y) ?? 0;
  const maxYValue = d3.max(data, (d) => d.y) ?? 1;

  const xScale = d3
    .scaleLinear()
    .domain([minXValue, maxXValue])
    .range([marginLeft, width - marginRight]);

  const yScale = d3
    .scaleLinear()
    .domain([minYValue, maxYValue])
    .range([height - marginBottom, marginTop]);

  // Define the line generator
  const line = d3
    .line<{ x: number; y: number }>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y));

  React.useEffect(() => {
    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll("*").remove();

    // Set up the SVG container
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    // Add X axis
    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(width / 80)
          .tickSizeOuter(0),
      );

    // Add Y axis
    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(yScale).ticks(height / 40))
      .call((g) =>
        g
          .selectAll(".tick line")
          .clone()
          .attr("x2", width - marginLeft - marginRight)
          .attr("stroke-opacity", 0.1),
      );

    // Add line path
    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", line(data));
  }, [data, line, xScale, yScale]);

  return (
    <div>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default LinePlot;
