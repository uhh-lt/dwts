import { Stack } from "@mui/material";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks.ts";
import { BBoxAnnotationReadResolved } from "../../api/openapi/models/BBoxAnnotationReadResolved.ts";
import CodeRenderer from "../Code/CodeRenderer.tsx";

interface BBoxAnnotationRendererProps {
  bboxAnnotation: number | BBoxAnnotationReadResolved;
}

function BBoxAnnotationRenderer({ bboxAnnotation }: BBoxAnnotationRendererProps) {
  if (typeof bboxAnnotation === "number") {
    return <BBoxAnnotationRendererWithoutData bboxAnnotationId={bboxAnnotation} />;
  } else {
    return <BBoxAnnotationRendererWithData bboxAnnotation={bboxAnnotation} />;
  }
}

function BBoxAnnotationRendererWithoutData({ bboxAnnotationId }: { bboxAnnotationId: number }) {
  const bboxAnnotation = BboxAnnotationHooks.useGetAnnotation(bboxAnnotationId);

  if (bboxAnnotation.isSuccess) {
    return <BBoxAnnotationRendererWithData bboxAnnotation={bboxAnnotation.data} />;
  } else if (bboxAnnotation.isError) {
    return <div>{bboxAnnotation.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function BBoxAnnotationRendererWithData({ bboxAnnotation }: { bboxAnnotation: BBoxAnnotationReadResolved }) {
  return (
    <Stack direction="row" alignItems="center">
      <CodeRenderer code={bboxAnnotation.code.id} />
      {": "}
      {`${bboxAnnotation.x_min}, ${bboxAnnotation.y_min}, ${bboxAnnotation.x_max}, ${bboxAnnotation.y_max}`}
    </Stack>
  );
}

export default BBoxAnnotationRenderer;
