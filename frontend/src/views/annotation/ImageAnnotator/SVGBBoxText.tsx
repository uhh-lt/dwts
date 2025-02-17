import React from "react";
import CodeHooks from "../../../api/CodeHooks.ts";
import { BBoxAnnotationRead } from "../../../api/openapi/models/BBoxAnnotationRead.ts";

type CustomTextProps = Omit<
  React.SVGTextElementAttributes<SVGTextElement>,
  "x" | "y" | "width" | "height" | "stroke" | "strokeWidth" | "fill" | "bbox"
>;

interface SVGBBoxTextProps {
  bbox: BBoxAnnotationRead;
  xCentering?: number;
  scaledRatio?: number;
}

function SVGBBoxText({ bbox, xCentering = 0, scaledRatio = 1, ...props }: SVGBBoxTextProps & CustomTextProps) {
  const code = CodeHooks.useGetCode(bbox.code_id);

  return (
    <>
      {code.data && (
        <text
          key={bbox.id}
          x={scaledRatio * (bbox.x_min + 3) + xCentering}
          y={scaledRatio * (bbox.y_max - 3)}
          width={scaledRatio * (bbox.x_max - bbox.x_min)}
          height={scaledRatio * (bbox.y_max - bbox.y_min)}
          fill={"white"}
          stroke={"black"}
          strokeWidth={0.75}
          {...props}
        >
          {code.data.name}
        </text>
      )}
    </>
  );
}

export default SVGBBoxText;
