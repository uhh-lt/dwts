import { useAppSelector } from "../../../plugins/ReduxHooks";
import { useTimelineAnalysisCheckQuery } from "./useTimelineAnalysisCheckQuery";

interface ValidDocumentsCheckerProps {
  projectId: number;
}

function ValidDocumentsChecker({ projectId }: ValidDocumentsCheckerProps) {
  // global client state (redux)
  const dateMetadataId = useAppSelector((state) => state.timelineAnalysis.projectMetadataId);

  // global server state (react-query)
  const validDocumentsCheck = useTimelineAnalysisCheckQuery(projectId, dateMetadataId);

  if (dateMetadataId === -1 || validDocumentsCheck.isLoading) {
    return <>Specify the metadata key that denotes the date of the document.</>;
  } else if (validDocumentsCheck.isError) {
    return <>{validDocumentsCheck.error}</>;
  } else {
    return (
      <>
        {validDocumentsCheck.data[0]} / {validDocumentsCheck.data[1]} documents have a valid date.
      </>
    );
  }
}

export default ValidDocumentsChecker;
