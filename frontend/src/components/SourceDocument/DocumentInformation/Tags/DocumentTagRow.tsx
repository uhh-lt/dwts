import { Box, Stack } from "@mui/material";
import TagHooks from "../../../../api/TagHooks.ts";
import TagUnlinkButton from "../../../Tag/TagExplorer/TagUnlinkButton.tsx";
import TagRenderer from "../../../Tag/TagRenderer.tsx";

interface DocumentTagRow {
  sdocId: number;
  tagId: number;
}

function DocumentTagRow({ tagId, sdocId }: DocumentTagRow) {
  const tag = TagHooks.useGetTag(tagId);

  return (
    <Stack direction={"row"}>
      {tag.isSuccess ? (
        <>
          <TagRenderer tag={tag.data} />
          <Box sx={{ flexGrow: 1 }} />
          <TagUnlinkButton sdocId={sdocId} tag={tag.data} />
        </>
      ) : tag.isLoading ? (
        <span>Loading...</span>
      ) : tag.isError ? (
        <span>{tag.error.message}</span>
      ) : (
        <span>Nothing to show :(</span>
      )}
    </Stack>
  );
}

export default DocumentTagRow;
