import TagHooks from "../../../api/TagHooks";
import { Chip, Tooltip } from "@mui/material";
import React from "react";
import { DocumentTagRead } from "../../../api/openapi";
import CancelIcon from "@mui/icons-material/Cancel";

interface DocumentTagChipProps {
  tagId: number;
  handleClick: (tag: DocumentTagRead) => void;
  handleDelete: (tag: DocumentTagRead) => void;
}

function DocumentTagChip({ tagId, handleClick, handleDelete }: DocumentTagChipProps) {
  const tag = TagHooks.useGetTag(tagId);

  return (
    <>
      {tag.isLoading && <Chip variant="outlined" label="Loading..." />}
      {tag.isError && <Chip variant="outlined" label={tag.error.message} />}
      {tag.isSuccess && (
        <Chip
          label={tag.data.title}
          variant="outlined"
          onClick={() => handleClick(tag.data)}
          onDelete={() => handleDelete(tag.data)}
          sx={{ borderColor: tag.data.description, color: tag.data.description }}
          deleteIcon={
            <Tooltip title="Remove tag">
              <CancelIcon style={{ color: tag.data.description }} />
            </Tooltip>
          }
        />
      )}
    </>
  );
}

export default DocumentTagChip;
