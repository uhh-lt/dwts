import * as d3 from "d3";
import React, { useRef, useState } from "react";

interface TopicDistrData {
  data: Record<string, number>[];
}

const TopicDistrChart: React.FC<TopicDistrData> = ({ data }) => {
  const [width, setWidth] = useState<number>(window.innerWidth);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Declare the chart dimensions and margins.
  const height = window.innerHeight * 0.7;
  const marginTop = window.innerHeight * 0.05;
  const marginRight = window.innerWidth * 0.1;
  const marginBottom = window.innerHeight * 0.05;
  const marginLeft = window.innerWidth * 0.1;

  // Declare the x (horizontal position) scale.
  const x = d3
    .scaleBand()
    .domain(data.map((_, i) => i.toString())) // descending frequency
    .range([marginLeft, width - marginRight])
    .padding(0.1);

  // Declare the y (vertical position) scale.
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.count) ?? 0])
    .range([height - marginBottom, marginTop]);

  React.useEffect(() => {
    // handles a window resize which in turn resizes the charts width
    const handleResize = () => {
      setWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);

    const svg = d3.select(svgRef.current);

    // clear previous content
    svg.selectAll("*").remove();

    // setup tooltip element
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "#f9f9f9")
      .style("border", "1px solid #d3d3d3")
      .style("padding", "5px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("visibility", "hidden")
      .style("font-size", "12px")
      .style("color", "black");

    // select the svg to add content
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // setup bars
    svg
      .append("g")
      .attr("fill", "steelblue")
      .selectAll()
      .data(data)
      .join("rect")
      .attr("x", (_, i) => x(i.toString()) ?? 0)
      .attr("y", (d) => y(d.count))
      .attr("height", (d) => y(0) - y(d.count))
      .attr("width", x.bandwidth())
      .on("mouseover", (_, d) => {
        tooltip.style("visibility", "visible").text(d.count);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", `${event.pageY - 10}px`).style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    // set title and place on top
    svg
      .append("g")
      .append("text")
      .attr("x", width / 2)
      .attr("y", marginTop * 0.7)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Topic Distribution");

    // set x-axis label
    svg
      .append("g")
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - marginBottom * 0.2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Topic");

    // set y-axis label
    svg
      .append("g")
      .append("text")
      .attr("transform", `rotate(-90)`)
      .attr("x", -(height / 2))
      .attr("y", marginLeft * 0.7)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Number of Documents");

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
      .call(d3.axisBottom(x).tickSizeOuter(0));

    // setup y-axis
    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickFormat((y) => y.toString()))
      .call((g) => g.select(".domain").remove());

    // clean-up
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, height, marginBottom, marginLeft, marginRight, marginTop, width, x, y]);

  return (
    <div>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default TopicDistrChart;
