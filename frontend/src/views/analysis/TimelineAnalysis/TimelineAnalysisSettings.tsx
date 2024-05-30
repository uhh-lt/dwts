import InfoIcon from "@mui/icons-material/Info";
import { MenuItem, Stack, TextField } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import React from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks";
import TimelineAnalysisHooks from "../../../api/TimelineAnalysisHooks";
import { DateGroupBy, DocType, MetaType, TimelineAnalysisRead } from "../../../api/openapi";
import ValidDocumentsChecker from "./ValidDocumentsChecker";

interface TimelineAnalysisSettingsProps {
  timelineAnalysis: TimelineAnalysisRead;
}

function TimelineAnalysisSettings({ timelineAnalysis }: TimelineAnalysisSettingsProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state (react-query)
  const projectMetadata = ProjectHooks.useGetMetadata(projectId);
  const filteredProjectMetadata = projectMetadata.data?.filter(
    (metadata) => metadata.doctype === DocType.TEXT && metadata.metatype === MetaType.DATE,
  );

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
          result_type: event.target.value,
        },
      },
    });
  };

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
            helperText={<ValidDocumentsChecker projectId={projectId} />}
            error={filteredProjectMetadata?.length === 0}
            disabled={filteredProjectMetadata?.length === 0}
          >
            {filteredProjectMetadata?.length === 0 ? (
              <MenuItem key={-1} value={-1}>
                <i>There is no DATE metadata for TEXT documents this project!</i>
              </MenuItem>
            ) : (
              <MenuItem key={-1} value={-1}>
                <i>None</i>
              </MenuItem>
            )}
            {filteredProjectMetadata?.map((metadata) => (
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
      </CardContent>
    </Card>
  );
}

export default TimelineAnalysisSettings;
