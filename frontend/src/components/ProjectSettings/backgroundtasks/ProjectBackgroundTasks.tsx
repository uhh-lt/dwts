import { Box, Divider, List, Toolbar, Typography } from "@mui/material";
import { useMemo } from "react";
import CrawlerHooks from "../../../api/CrawlerHooks.ts";
import LLMHooks from "../../../api/LLMHooks.ts";
import MLHooks from "../../../api/MLHooks.ts";
import PreProHooks from "../../../api/PreProHooks.ts";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { CrawlerJobRead } from "../../../api/openapi/models/CrawlerJobRead.ts";
import { LLMJobRead } from "../../../api/openapi/models/LLMJobRead.ts";
import { MLJobRead } from "../../../api/openapi/models/MLJobRead.ts";
import { PreprocessingJobRead } from "../../../api/openapi/models/PreprocessingJobRead.ts";
import { ProjectRead } from "../../../api/openapi/models/ProjectRead.ts";
import CrawlerJobListItem from "./CrawlerJobListItem.tsx";
import LLMJobListItem from "./LLMJobListItem.tsx";
import MLJobListItem from "./MLJobListItem.tsx";
import PreProJobListItem from "./PreProJobListItem.tsx";

// type guards
const isCrawlerJob = (job: CrawlerJobRead | PreprocessingJobRead | LLMJobRead | MLJobRead): job is CrawlerJobRead => {
  return "output_dir" in job;
};
const isPreProJob = (
  job: CrawlerJobRead | PreprocessingJobRead | LLMJobRead | MLJobRead,
): job is PreprocessingJobRead => {
  return "payloads" in job;
};
const isLLMJob = (job: CrawlerJobRead | PreprocessingJobRead | LLMJobRead | MLJobRead): job is LLMJobRead => {
  return "num_steps_total" in job;
};
const isMLJob = (job: CrawlerJobRead | PreprocessingJobRead | LLMJobRead | MLJobRead): job is MLJobRead => {
  return "parameters" in job && "ml_job_type" in job.parameters;
};

interface ProjectBackgroundTasksProps {
  project: ProjectRead;
}

function ProjectBackgroundTasks({ project }: ProjectBackgroundTasksProps) {
  // global server state (react-query)
  const crawlerJobs = CrawlerHooks.useGetAllCrawlerJobs(project.id);
  const preProJobs = PreProHooks.useGetAllPreProJobs(project.id);
  const llmJobs = LLMHooks.useGetAllLLMJobs(project.id);
  const mlJobs = MLHooks.useGetAllMLJobs(project.id);

  const backgroundJobsByStatus = useMemo(() => {
    const result: Record<BackgroundJobStatus, (CrawlerJobRead | PreprocessingJobRead | LLMJobRead | MLJobRead)[]> = {
      [BackgroundJobStatus.WAITING]: [],
      [BackgroundJobStatus.RUNNING]: [],
      [BackgroundJobStatus.FINISHED]: [],
      [BackgroundJobStatus.ERRORNEOUS]: [],
      [BackgroundJobStatus.ABORTED]: [],
    };

    if (!crawlerJobs.data && !preProJobs.data && !llmJobs.data && !mlJobs.data) {
      return result;
    }

    if (crawlerJobs.data) {
      for (const job of crawlerJobs.data) {
        if (!job.status) continue;
        result[job.status].push(job);
      }
    }
    if (preProJobs.data) {
      for (const job of preProJobs.data) {
        if (!job.status) continue;
        result[job.status].push(job);
      }
    }
    if (llmJobs.data) {
      for (const job of llmJobs.data) {
        if (!job.status) continue;
        result[job.status].push(job);
      }
    }
    if (mlJobs.data) {
      for (const job of mlJobs.data) {
        if (!job.status) continue;
        result[job.status].push(job);
      }
    }

    return result;
  }, [crawlerJobs.data, preProJobs.data, llmJobs.data]);

  // rendering
  const renderBackgroundJobs = (status: BackgroundJobStatus) => {
    return (
      <>
        {backgroundJobsByStatus[status].map((job) => {
          if (isCrawlerJob(job)) {
            return <CrawlerJobListItem key={job.id} initialCrawlerJob={job} />;
          } else if (isPreProJob(job)) {
            return <PreProJobListItem key={job.id} initialPreProJob={job} />;
          } else if (isLLMJob(job)) {
            return <LLMJobListItem key={job.id} initialLLMJob={job} />;
          } else if (isMLJob(job)) {
            return <MLJobListItem key={job.id} initialMLJob={job} />;
          } else {
            return null;
          }
        })}
        {backgroundJobsByStatus[status].length === 0 && <Typography pl={3}>empty</Typography>}
      </>
    );
  };

  return (
    <>
      {(crawlerJobs.isLoading || preProJobs.isLoading || llmJobs.isLoading) && <>Loading background jobs...</>}
      {crawlerJobs.isError && <>An error occurred while loading crawler jobs for project {project.id}...</>}
      {preProJobs.isError && <>An error occurred while loading preprocessing jobs for project {project.id}...</>}
      {llmJobs.isError && <>An error occurred while loading llm jobs for project {project.id}...</>}
      {crawlerJobs.isSuccess && preProJobs.isSuccess && llmJobs.isSuccess && (
        <>
          <Toolbar variant="dense">
            <Typography variant="h6" component="div">
              Waiting
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>{renderBackgroundJobs(BackgroundJobStatus.WAITING)}</List>
          <Toolbar variant="dense">
            <Typography variant="h6" component="div">
              Running
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>{renderBackgroundJobs(BackgroundJobStatus.RUNNING)}</List>
          <Toolbar variant="dense">
            <Typography variant="h6" component="div">
              Finished
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>{renderBackgroundJobs(BackgroundJobStatus.FINISHED)}</List>
          <Toolbar variant="dense">
            <Typography variant="h6" component="div">
              Aborted
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>{renderBackgroundJobs(BackgroundJobStatus.ABORTED)}</List>
          <Toolbar variant="dense">
            <Typography variant="h6" component="div">
              Failed
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
          <Divider />
          <List>{renderBackgroundJobs(BackgroundJobStatus.ERRORNEOUS)}</List>
        </>
      )}
    </>
  );
}

export default ProjectBackgroundTasks;
