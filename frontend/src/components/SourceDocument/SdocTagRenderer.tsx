import { Stack, StackProps } from "@mui/material";
import TagHooks from "../../api/TagHooks.ts";
import TagRenderer from "../Tag/TagRenderer.tsx";

interface SharedProps {
  stackProps?: Omit<StackProps, "direction" | "alignItems">;
}
interface SdocTagsRendererProps {
  sdocId?: number;
  tagIds?: number[];
}

function SdocTagsRenderer({ sdocId, tagIds, ...props }: SdocTagsRendererProps & SharedProps) {
  if (sdocId === undefined && tagIds === undefined) {
    return <>Nothing to show :(</>;
  }

  if (tagIds) {
    return <SdocTagsRendererWithData tagIds={tagIds} {...props} />;
  }

  if (sdocId) {
    return <SdocTagsRendererWithoutData sdocId={sdocId} {...props} />;
  }
  return null;
}

function SdocTagsRendererWithoutData({ sdocId, ...props }: { sdocId: number } & SharedProps) {
  const tags = TagHooks.useGetAllTagIdsBySdocId(sdocId);

  if (tags.isSuccess) {
    return <SdocTagsRendererWithData tagIds={tags.data} {...props} />;
  } else if (tags.isError) {
    return <div>{tags.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SdocTagsRendererWithData({ tagIds, stackProps }: { tagIds: number[] } & SharedProps) {
  return (
    <Stack direction="row" alignItems="center" {...stackProps}>
      {tagIds.map((tagId) => (
        <TagRenderer key={tagId} tag={tagId} mr={0.5} sx={{ textWrap: "nowrap" }} />
      ))}
    </Stack>
  );
}

export default SdocTagsRenderer;
