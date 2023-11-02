import PlayCircleFilledWhiteIcon from "@mui/icons-material/PlayCircleFilledWhite";
import { Box, CardMedia, CardProps, Typography } from "@mui/material";
import { useMemo } from "react";
import ReactWordcloud, { OptionsProp, Word } from "react-wordcloud";
import SdocHooks from "../../../../api/SdocHooks";
import { DocType, SourceDocumentRead } from "../../../../api/openapi";
import { useAppSelector } from "../../../../plugins/ReduxHooks";
import { SearchResultProps } from "../SearchResultProps";
import SearchResultCardBase from "./SearchResultCardBase";

function LexicalSearchResultCard({
  sdocId,
  handleClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
  ...props
}: SearchResultProps & CardProps) {
  const thumbnailUrl = SdocHooks.useGetThumbnailURL(sdocId).data ?? "";
  return (
    <SearchResultCardBase
      sdocId={sdocId}
      handleClick={handleClick}
      handleOnContextMenu={handleOnContextMenu}
      handleOnCheckboxChange={handleOnCheckboxChange}
      {...props}
      renderContent={(sdoc) => (
        <>
          {sdoc.doctype === DocType.TEXT ? (
            <LexicalSearchResultCardTextContent sdoc={sdoc} />
          ) : sdoc.doctype === DocType.IMAGE ? (
            <CardMedia sx={{ mb: 1.5 }} component="img" height="200" image={thumbnailUrl} alt="Paella dish" />
          ) : sdoc.doctype === DocType.AUDIO ? (
            <Box sx={{ position: "relative", height: 200 }}>
              <PlayCircleFilledWhiteIcon
                sx={{
                  fontSize: 75,
                  top: "calc(50% - 37.5px)",
                  left: "calc(50% - 37.5px)",
                  position: "absolute",
                  color: "rgba(0, 0, 0, 0.666)",
                }}
              />
              <CardMedia sx={{ mb: 1.5 }} component="img" height="200" image={thumbnailUrl} alt="Tofu meatballs" />
            </Box>
          ) : sdoc.doctype === DocType.VIDEO ? (
            <Box sx={{ position: "relative", height: 200 }}>
              <PlayCircleFilledWhiteIcon
                sx={{
                  fontSize: 75,
                  top: "calc(50% - 37.5px)",
                  left: "calc(50% - 37.5px)",
                  position: "absolute",
                  color: "rgba(0, 0, 0, 0.666)",
                }}
              />
              <CardMedia sx={{ mb: 1.5 }} component="img" height="200" image={thumbnailUrl} alt="Tofu meatballs" />
            </Box>
          ) : (
            <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
              DOC TYPE IS NOT SUPPORTED
            </Typography>
          )}
        </>
      )}
    />
  );
}

const wordCloudOptions: OptionsProp = {
  enableTooltip: false,
  deterministic: true,
  fontFamily: "impact",
  fontSizes: [12, 23],
  padding: 1,
  scale: "sqrt",
  transitionDuration: 0,
  rotations: 2,
  rotationAngles: [-90, 0],
};

function LexicalSearchResultCardTextContent({ sdoc }: { sdoc: SourceDocumentRead }) {
  // global client state (redux)
  const searchResStyle = useAppSelector((state) => state.settings.search.searchResStyle);

  return useMemo(() => {
    // rendering
    if (searchResStyle === "text") {
      return <TextContent sdoc={sdoc} />;
    }
    return <WordCloudContent sdoc={sdoc} />;
  }, [searchResStyle, sdoc]);
}

function WordCloudContent({ sdoc }: { sdoc: SourceDocumentRead }) {
  // global server state (react-query)
  const wordFrequencies = SdocHooks.useGetWordFrequencies(sdoc.id);

  // computed
  const wordCloudInput = useMemo(() => {
    if (!wordFrequencies.data) return [];

    let entries: [string, number][] = Object.entries(JSON.parse(wordFrequencies.data.value));
    entries.sort((a, b) => b[1] - a[1]); // sort array descending
    return entries.slice(0, 20).map((e) => {
      return { text: e[0], value: e[1] } as Word;
    });
  }, [wordFrequencies.data]);

  // rendering
  return (
    <div style={{ overflow: "hidden", padding: 0, height: 212 }}>
      <ReactWordcloud options={wordCloudOptions} words={wordCloudInput} />
    </div>
  );
}

function TextContent({ sdoc }: { sdoc: SourceDocumentRead }) {
  return (
    <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
      {sdoc.content}
    </Typography>
  );
}

export default LexicalSearchResultCard;
