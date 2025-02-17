import InfoIcon from "@mui/icons-material/Info";
import { MenuItem, Stack, TextField } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import React from "react";
import { useParams } from "react-router-dom";
import CotaHooks from "../../../api/CotaHooks.ts";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { COTARead } from "../../../api/openapi/models/COTARead.ts";
import { DateGroupBy } from "../../../api/openapi/models/DateGroupBy.ts";
import { DocType } from "../../../api/openapi/models/DocType.ts";
import { MetaType } from "../../../api/openapi/models/MetaType.ts";
import SdocsWithDateCounter from "../../../components/Metadata/SdocsWithDateCounter/SdocsWithDateCounter.tsx";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";

interface CotaSettingsProps {
  cota: COTARead;
}

function CotaSettings({ cota }: CotaSettingsProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state (react-query)
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();
  const filteredProjectMetadata = projectMetadata.data?.filter(
    (metadata) => metadata.doctype === DocType.TEXT && metadata.metatype === MetaType.DATE,
  );

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // actions
  const updateCota = CotaHooks.useUpdateCota();
  const handleChangeMetadataId = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateCota.mutate(
      {
        cotaId: cota.id,
        requestBody: {
          ...cota,
          timeline_settings: {
            ...cota.timeline_settings,
            date_metadata_id: parseInt(event.target.value),
          },
        },
      },
      {
        onSuccess(data) {
          openSnackbar({
            text: `Updated timeline settings of CotA '${data.name}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleChangeGroupBy = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateCota.mutate(
      {
        cotaId: cota.id,
        requestBody: {
          ...cota,
          timeline_settings: {
            ...cota.timeline_settings,
            group_by: event.target.value as DateGroupBy,
          },
        },
      },
      {
        onSuccess(data) {
          openSnackbar({
            text: `Updated timeline settings of CotA '${data.name}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleChangeThreshold = (event: React.FocusEvent<HTMLInputElement>) => {
    if (event.target.value.trim() === "") return;
    updateCota.mutate(
      {
        cotaId: cota.id,
        requestBody: {
          ...cota,
          timeline_settings: {
            ...cota.timeline_settings,
            threshold: parseFloat(event.target.value),
          },
        },
      },
      {
        onSuccess(data) {
          openSnackbar({
            text: `Updated timeline settings of CotA '${data.name}'`,
            severity: "success",
          });
        },
      },
    );
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
        title="Timeline Analysis Settings"
        subheader="Adjust the visualization parameters"
      />
      <CardContent className="myFlexFillAllContainer">
        <Stack spacing={3}>
          <TextField
            select
            fullWidth
            label={"Group by"}
            variant="outlined"
            value={cota.timeline_settings.group_by}
            onChange={handleChangeGroupBy}
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
            value={cota.timeline_settings.date_metadata_id || -1}
            onChange={handleChangeMetadataId}
            helperText={
              <SdocsWithDateCounter
                projectId={projectId}
                dateMetadataId={cota.timeline_settings.date_metadata_id || -1}
              />
            }
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
            fullWidth
            label={"Probabililty threshold"}
            variant="outlined"
            defaultValue={cota.timeline_settings.threshold}
            helperText={"Specify the probabililty threshold."}
            onBlur={handleChangeThreshold}
            type="number"
            inputProps={{
              min: 0,
              max: 1,
              step: 0.1,
            }}
            slotProps={{
              inputLabel: { shrink: true },
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

export default CotaSettings;
