import { BBoxAnnotationReadResolvedCode } from "../../../api/openapi";
import React from "react";
import CodeHooks from "../../../api/CodeHooks";

interface SVGBBoxTextProps {
  bbox: BBoxAnnotationReadResolvedCode;
  onContextMenu: (e: React.MouseEvent<SVGTextElement, MouseEvent>, bbox: BBoxAnnotationReadResolvedCode) => void;
}

function SVGBBoxText({ bbox, onContextMenu }: SVGBBoxTextProps) {
  const code = CodeHooks.useGetCode(bbox.code.id);

  return (
    <>
      {code.data && (
        <text
          key={bbox.id}
          x={bbox.x_min + 3}
          y={bbox.y_max - 3}
          width={bbox.x_max - bbox.x_min}
          height={bbox.y_max - bbox.y_min}
          fill={"white"}
          stroke={"black"}
          strokeWidth={0.75}
          fontSize={"21px"}
          onContextMenu={(e) => onContextMenu(e, bbox)}
        >
          {code.data.name}
        </text>
      )}
    </>
  );
}

export default SVGBBoxText;
