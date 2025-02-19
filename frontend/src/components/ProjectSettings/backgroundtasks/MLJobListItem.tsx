import { Typography } from "@mui/material";
import MLHooks from "../../../api/MLHooks.ts";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { MLJobRead } from "../../../api/openapi/models/MLJobRead.ts";
import { dateToLocaleString } from "../../../utils/DateUtils.ts";
import BackgroundJobListItem from "./BackgroundJobListItem.tsx";

interface MLJobListItemProps {
  initialMLJob: MLJobRead;
}

function MLJobListItem({ initialMLJob }: MLJobListItemProps) {
  // global server state (react-query)
  const mlJob = MLHooks.usePollMLJob(initialMLJob.id, initialMLJob);

  // compute date sting
  const createdDate = dateToLocaleString(mlJob.data!.created);
  const updatedDate = dateToLocaleString(mlJob.data!.updated);
  let subTitle = `${mlJob.data!.parameters.ml_job_type}, started at ${createdDate}`;
  if (mlJob.data!.status === BackgroundJobStatus.FINISHED) {
    subTitle += `, finished at ${updatedDate}`;
  } else if (mlJob.data!.status === BackgroundJobStatus.ABORTED) {
    subTitle += `, aborted at ${updatedDate}`;
  } else if (mlJob.data!.status === BackgroundJobStatus.ERRORNEOUS) {
    subTitle += `, failed at ${updatedDate}`;
  }

  if (mlJob.isSuccess) {
    return (
      <BackgroundJobListItem
        jobStatus={mlJob.data.status}
        jobId={mlJob.data.id}
        title={`ML Job - ${mlJob.data.parameters.ml_job_type}}`}
        subTitle={subTitle}
      >
        <Typography>{mlJob.data.error}</Typography>
      </BackgroundJobListItem>
    );
  } else {
    return null;
  }
}

export default MLJobListItem;
