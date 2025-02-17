import React from "react";
import CodeHooks from "../../../api/CodeHooks.ts";
import { BBoxAnnotationRead } from "../../../api/openapi/models/BBoxAnnotationRead.ts";

type CustomSVGProps = Omit<
  React.SVGProps<SVGRectElement>,
  "className" | "x" | "y" | "width" | "height" | "stroke" | "strokeWidth" | "fill" | "bbox"
>;

interface SVGBBoxProps {
  bbox: BBoxAnnotationRead;
  xCentering?: number;
  scaledRatio?: number;
}

function SVGBBox({ bbox, xCentering = 0, scaledRatio = 1, ...props }: SVGBBoxProps & CustomSVGProps) {
  const code = CodeHooks.useGetCode(bbox.code_id);

  return (
    <>
      {code.data && (
        <rect
          className={`bbox-${bbox.id}`}
          key={bbox.id}
          x={scaledRatio * bbox.x_min + xCentering}
          y={scaledRatio * bbox.y_min}
          width={scaledRatio * (bbox.x_max - bbox.x_min)}
          height={scaledRatio * (bbox.y_max - bbox.y_min)}
          stroke={code.data.color}
          strokeWidth={3}
          fill={"transparent"}
          {...props}
        />
      )}
    </>
  );
}

export default SVGBBox;
