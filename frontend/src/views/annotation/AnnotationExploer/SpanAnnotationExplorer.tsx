import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead.ts";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotationExplorer from "./AnnotationExplorer.tsx";
import SpanAnnotationCard from "./SpanAnnotationCard.tsx";

const filterByText = (text: string) => (annotation: SpanAnnotationRead) => annotation.text.includes(text);

function SpanAnnotationExplorer({ sdocId }: { sdocId: number }) {
  // data
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const annotations = SpanAnnotationHooks.useGetSpanAnnotationsBatch(sdocId, visibleUserId);

  return (
    <AnnotationExplorer
      annotations={annotations.data?.map((annotation) => ({
        ...annotation,
        code_id: annotation.code_id,
        span_text_id: 1,
      }))}
      filterByText={filterByText}
      renderAnnotationCard={SpanAnnotationCard}
    />
  );
}

export default SpanAnnotationExplorer;
