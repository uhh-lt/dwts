import InfoIcon from "@mui/icons-material/Info";
import { CircularProgress, MenuItem, Stack, TextField } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import React from "react";
import { useParams } from "react-router-dom";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import TimelineAnalysisHooks from "../../../api/TimelineAnalysisHooks.ts";
import { DateGroupBy } from "../../../api/openapi/models/DateGroupBy.ts";
import { DocType } from "../../../api/openapi/models/DocType.ts";
import { MetaType } from "../../../api/openapi/models/MetaType.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import { TimelineAnalysisResultType } from "../../../api/openapi/models/TimelineAnalysisResultType.ts";
import SdocsWithDateCounter from "../../../components/Metadata/SdocsWithDateCounter/SdocsWithDateCounter.tsx";

interface TimelineAnalysisSettingsProps {
  timelineAnalysis: TimelineAnalysisRead;
}

function TimelineAnalysisSettings({ timelineAnalysis }: TimelineAnalysisSettingsProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state (react-query)
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();
  const filteredProjectMetadata = projectMetadata.data?.filter(
    (metadata) => metadata.doctype === DocType.TEXT && metadata.metatype === MetaType.DATE,
  );

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title="Settings"
        subheader="Adjust the visualization settings"
      />
      <CardContent className="myFlexFillAllContainer">
        {filteredProjectMetadata ? (
          <TimelineAnalysisSettingsContent
            timelineAnalysis={timelineAnalysis}
            projectId={projectId}
            projectMetadata={filteredProjectMetadata}
          />
        ) : projectMetadata.isLoading ? (
          <CircularProgress />
        ) : (
          <div>Failed to load metadata</div>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineAnalysisSettingsContent({
  timelineAnalysis,
  projectMetadata,
  projectId,
}: TimelineAnalysisSettingsProps & { projectId: number; projectMetadata: ProjectMetadataRead[] }) {
  // handlers (for ui)
  const updateTimelineAnalysisMutation = TimelineAnalysisHooks.useUpdateTimelineAnalysis();
  const handleGroupByChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateTimelineAnalysisMutation.mutate({
      timelineAnalysisId: timelineAnalysis.id,
      requestBody: {
        settings: {
          ...timelineAnalysis.settings,
          group_by: event.target.value as DateGroupBy,
        },
      },
    });
  };
  const handleChangeMetadataId = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateTimelineAnalysisMutation.mutate({
      timelineAnalysisId: timelineAnalysis.id,
      requestBody: {
        settings: {
          ...timelineAnalysis.settings,
          date_metadata_id: parseInt(event.target.value),
        },
      },
    });
  };
  const handleChangeResultType = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateTimelineAnalysisMutation.mutate({
      timelineAnalysisId: timelineAnalysis.id,
      requestBody: {
        settings: {
          ...timelineAnalysis.settings,
          result_type: event.target.value as TimelineAnalysisResultType,
        },
      },
    });
  };

  return (
    <Stack spacing={3}>
      <TextField
        select
        fullWidth
        label={"Group by"}
        variant="outlined"
        value={timelineAnalysis.settings.group_by}
        onChange={handleGroupByChange}
        helperText="Specify the aggregation of the results."
      >
        {Object.values(DateGroupBy).map((value) => (
          <MenuItem key={value} value={value}>
            {value}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        fullWidth
        label={"Date metadata"}
        variant="outlined"
        value={timelineAnalysis.settings.date_metadata_id || -1}
        onChange={handleChangeMetadataId}
        helperText={
          <SdocsWithDateCounter
            projectId={projectId}
            dateMetadataId={timelineAnalysis.settings.date_metadata_id || -1}
          />
        }
        error={projectMetadata.length === 0}
        disabled={projectMetadata.length === 0}
      >
        {projectMetadata.length === 0 ? (
          <MenuItem key={-1} value={-1}>
            <i>There is no DATE metadata for TEXT documents this project!</i>
          </MenuItem>
        ) : (
          <MenuItem key={-1} value={-1}>
            <i>None</i>
          </MenuItem>
        )}
        {projectMetadata.map((metadata) => (
          <MenuItem key={metadata.key} value={metadata.id}>
            {metadata.key}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        fullWidth
        label={"Result type"}
        variant="outlined"
        value={timelineAnalysis.settings.result_type}
        onChange={handleChangeResultType}
        helperText="Specify the type of the results."
        disabled
      >
        <MenuItem value={"document"}>Document</MenuItem>
      </TextField>
    </Stack>
  );
}

export default TimelineAnalysisSettings;
