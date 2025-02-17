import CheckIcon from "@mui/icons-material/Check";
import LabelIcon from "@mui/icons-material/Label";
import { LoadingButton } from "@mui/lab";
import { MenuItem, Select, Stack } from "@mui/material";
import { useState } from "react";
import TagHooks from "../../../api/TagHooks.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

function BulkDocTagger() {
  // global client state (redux)
  const isFixedSamplingStrategy = useAppSelector((state) => state.documentSampler.isFixedSamplingStrategy);
  const chartData = useAppSelector((state) => state.documentSampler.chartData);

  // global server state (react query)
  const documentTags = TagHooks.useGetAllTags();

  // local client state
  const [selectedDocumentTagId, setSelectedDocumentTagId] = useState(-1);

  // mutation
  const { mutate: linkDocumentTags, isPending: isLinkingDocumentTags } = TagHooks.useBulkLinkDocumentTags();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // actions
  const bulkTagDocuments = () => {
    linkDocumentTags(
      {
        requestBody: {
          source_document_ids: chartData
            .map((x) => (isFixedSamplingStrategy ? x.fixedSampleSdocIds : x.relativeSampleSdocIds))
            .flat(),
          document_tag_ids: [selectedDocumentTagId],
        },
      },
      {
        onSuccess: () => {
          openSnackbar({
            text: `Tagged sampled documents!`,
            severity: "success",
          });
        },
      },
    );
  };

  return (
    <Stack direction="row" spacing={1}>
      <Select
        size="small"
        value={selectedDocumentTagId?.toString() || "-1"}
        onChange={(event) => setSelectedDocumentTagId(parseInt(event.target.value))}
        SelectDisplayProps={{ style: { display: "inline-flex", alignItems: "center" } }}
      >
        <MenuItem value="-1">Select a tag...</MenuItem>
        {documentTags.data?.map((tag) => (
          <MenuItem key={tag.id} value={tag.id.toString()}>
            <LabelIcon fontSize="small" style={{ color: tag.color, marginRight: "8px" }} />
            {tag.name}
          </MenuItem>
        ))}
      </Select>
      <LoadingButton
        onClick={() => bulkTagDocuments()}
        disabled={selectedDocumentTagId === -1 || chartData.length === 0}
        loading={isLinkingDocumentTags}
        loadingPosition="start"
        startIcon={<CheckIcon />}
      >
        Apply tag to documents
      </LoadingButton>
    </Stack>
  );
}

export default BulkDocTagger;
