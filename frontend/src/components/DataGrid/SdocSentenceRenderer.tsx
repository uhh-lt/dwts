import { GridRenderCellParams } from "@mui/x-data-grid";
import SdocHooks from "../../api/SdocHooks";
import { SourceDocumentWithDataRead } from "../../api/openapi";
import { renderTextCellExpand } from "./renderTextCellExpand";

export interface SdocSentenceRendererSharedProps {
  sentenceId: number;
  params: GridRenderCellParams;
}

interface SdocSentenceRendererProps extends SdocSentenceRendererSharedProps {
  sdoc: number | SourceDocumentWithDataRead;
}

function SdocSentenceRenderer({ sdoc, ...props }: SdocSentenceRendererProps) {
  if (typeof sdoc === "number") {
    return <SdocSentenceRendererWithoutData sdocId={sdoc} {...props} />;
  } else {
    return <SdocSentenceRendererWithData sdoc={sdoc} {...props} />;
  }
}

function SdocSentenceRendererWithoutData({ sdocId, ...props }: { sdocId: number } & SdocSentenceRendererSharedProps) {
  const sdoc = SdocHooks.useGetDocument(sdocId);

  if (sdoc.isSuccess) {
    return <SdocSentenceRendererWithData sdoc={sdoc.data} {...props} />;
  } else if (sdoc.isError) {
    return <div>{sdoc.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SdocSentenceRendererWithData({
  sdoc,
  sentenceId,
  params,
}: { sdoc: SourceDocumentWithDataRead } & SdocSentenceRendererSharedProps) {
  return renderTextCellExpand({
    ...params,
    value: sdoc.sentences[sentenceId],
  });
}

export default SdocSentenceRenderer;
