import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks.ts";
import { BBoxAnnotationReadResolved } from "../../../api/openapi/models/BBoxAnnotationReadResolved.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotationExplorer from "./AnnotationExplorer.tsx";
import BBoxAnnotationCard from "./BBoxAnnotationCard.tsx";

const filterByText = (text: string) => (annotation: BBoxAnnotationReadResolved) => annotation.code.name.includes(text);

const estimateSize = () => 190;

function BBoxAnnotationExplorer({ sdocId }: { sdocId: number }) {
  // data
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const annotations = BboxAnnotationHooks.useGetBBoxAnnotationsBatch(sdocId, visibleUserId);

  return (
    <AnnotationExplorer
      annotations={annotations.data}
      filterByText={filterByText}
      renderAnnotationCard={(props) => <BBoxAnnotationCard {...props} />}
      estimateSize={estimateSize}
    />
  );
}

export default BBoxAnnotationExplorer;
