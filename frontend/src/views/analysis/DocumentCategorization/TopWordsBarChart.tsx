import * as d3 from "d3";
import React, { useEffect, useRef, useState } from "react";

interface TopWordsProps {
  data: Record<string, { word: string; score: number }>[];
  topicNum: number;
}

const TopWordsBarChart: React.FC<TopWordsProps> = ({ data, topicNum }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState<number>(window.innerWidth);

  let maxScore = 0;
  for (const topic of data) {
    for (const word in topic) {
      if (topic[word]["score"] > maxScore) {
        maxScore = topic[word]["score"];
      }
    }
  }

  let currentMaxScore = 0;
  for (const word in data[topicNum]) {
    if (data[topicNum][word]["score"] > currentMaxScore) {
      currentMaxScore = data[topicNum][word]["score"];
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
    .domain(d3.sort(Object.values(data[topicNum]), (d) => -d.score).map((d) => d.word))
    .rangeRound([marginTop, height - marginBottom])
    .padding(0.1);

  const formatScore = d3.format(".5f");

  // Window resize effect
  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // D3 rendering effect
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    // Setup bars
    svg
      .append("g")
      .attr("fill", "steelblue")
      .selectAll()
      .data(Object.values(data[topicNum]))
      .join("rect")
      .attr("x", x(0))
      .attr("y", (d) => y(d.word) ?? 0)
      .attr("width", (d) => x(d.score) * 0.995 - x(0))
      .attr("height", y.bandwidth());

    // Set title
    svg
      .append("g")
      .append("text")
      .attr("x", width / 2)
      .attr("y", marginTop * 0.7)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Top Words for the Topic: " + topicNum);

    // Set x-axis label
    svg
      .append("g")
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - marginBottom * 0.2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Score");

    // Text inside bars
    svg
      .append("g")
      .attr("fill", "white")
      .attr("text-anchor", "end")
      .selectAll()
      .data(Object.values(data[topicNum]))
      .join("text")
      .attr("x", (d) => x(d.score) * 0.995)
      .attr("y", (d) => (y(d.word) ?? 0) + y.bandwidth() / 2)
      .style("font-size", "11px")
      .attr("dy", "0.35em")
      .attr("dx", -4)
      .text((d) => formatScore(d.score))
      .call((text) =>
        text
          .filter((d) => x(d.score) - x(0) < 20)
          .attr("dx", +4)
          .attr("fill", "black")
          .attr("text-anchor", "start"),
      );

    // Setup border
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

    // Setup axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).ticks(width / 200))
      .call((g) => g.select(".domain").remove())
      .style("font-size", "12px");

    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickSizeOuter(0))
      .style("font-size", "14px");
  }, [topicNum, data, formatScore, height, marginBottom, marginLeft, marginRight, marginTop, width, x, y]);

  return (
    <div>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default TopWordsBarChart;
