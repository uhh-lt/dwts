import React, { useCallback, useEffect, useState } from "react";
import { SourceDocumentKeywords } from "../../../../api/openapi";
import { Autocomplete, Chip, Grid, Stack, TextField } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SdocHooks from "../../../../api/SdocHooks";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import ClearIcon from "@mui/icons-material/Clear";
import SnackbarAPI from "../../../../features/Snackbar/SnackbarAPI";

interface DocumentKeywordsProps {
  sdocId: number | undefined;
}

function DocumentKeywordsRow({ sdocId }: DocumentKeywordsProps) {
  const keywords = SdocHooks.useGetDocumentKeywords(sdocId);

  return (
    <>
      {sdocId && keywords.isSuccess ? (
        <DocumentKeywordsContent sdocId={sdocId} keywords={keywords.data} />
      ) : keywords.isError ? (
        <div>{keywords.error.message}</div>
      ) : (
        <div>Loading...</div>
      )}
    </>
  );
}

export default DocumentKeywordsRow;

function DocumentKeywordsContent({ keywords, sdocId }: { keywords: SourceDocumentKeywords; sdocId: number }) {
  // keyword input
  const [keywordInput, setKeywordInput] = useState<any>(keywords.keywords);

  // initialize form when metadata changes
  useEffect(() => {
    setKeywordInput(keywords.keywords);
  }, [keywords]);

  // mutation
  const updateMutation = SdocHooks.useUpdateDocumentKeywords();

  // form handling
  const handleUpdate = useCallback(() => {
    // only update if data has changed!
    if (keywords.keywords !== keywordInput) {
      const mutation = updateMutation.mutate;
      mutation(
        {
          requestBody: {
            source_document_id: sdocId,
            keywords: keywordInput,
          },
        },
        {
          onSuccess: (keywords) => {
            SnackbarAPI.openSnackbar({
              text: "Successfully updated keywords of document " + keywords.source_document_id,
              severity: "success",
            });
          },
        },
      );
    }
  }, [keywords.keywords, keywordInput, updateMutation.mutate, sdocId]);

  const handleClear = useCallback(() => {
    // only update if data has changed!
    if (keywords.keywords.length > 0) {
      const mutation = updateMutation.mutate;
      mutation(
        {
          requestBody: {
            source_document_id: sdocId,
            keywords: [],
          },
        },
        {
          onSuccess: (keywords) => {
            SnackbarAPI.openSnackbar({
              text: "Successfully cleared keywords of document " + keywords.source_document_id,
              severity: "success",
            });
          },
        },
      );
    }
  }, [keywords.keywords.length, sdocId, updateMutation.mutate]);

  return (
    <Stack direction="row" alignItems="flex-end" mb={1.5}>
      <InfoOutlinedIcon fontSize="medium" sx={{ mr: 1 }} />
      <TextField value={"keywords"} fullWidth size="small" variant="standard" disabled />
      <Autocomplete
        multiple
        options={[]}
        value={keywordInput}
        onChange={(event, newValue) => {
          setKeywordInput(newValue);
        }}
        freeSolo
        disableClearable
        fullWidth
        limitTags={3}
        renderTags={(value: readonly string[], getTagProps) =>
          value.map((option: string, index: number) => (
            <Chip style={{ borderRadius: "4px" }} variant="filled" label={option} {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => (
          <TextField {...params} fullWidth variant="standard" placeholder="keywords" onBlur={() => handleUpdate()} />
        )}
      />
      <Tooltip title="Clear">
        <span>
          <IconButton size="small" onClick={() => handleClear()} disabled={updateMutation.isLoading}>
            <ClearIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
