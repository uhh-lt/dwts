import { Stack } from "@mui/material";
import { Link } from "react-router-dom";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks.ts";
import { SpanAnnotationRead } from "../../api/openapi/models/SpanAnnotationRead.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { AnnoActions } from "../../views/annotation/annoSlice.ts";
import CodeRenderer from "../Code/CodeRenderer.tsx";
import SdocMetadataRenderer from "../Metadata/SdocMetadataRenderer.tsx";
import SdocRenderer, { SdocRendererSharedProps } from "../SourceDocument/SdocRenderer.tsx";
import SdocTagsRenderer from "../SourceDocument/SdocTagRenderer.tsx";

interface SpanAnnotationRendererSharedProps {
  showCode?: boolean;
  showSpanText?: boolean;
  showSdoc?: boolean;
  showSdocTags?: boolean;
  showSdocProjectMetadataId?: number;
  sdocRendererProps?: SdocRendererSharedProps;
  link?: boolean;
}

interface SpanAnnotationRendererProps {
  spanAnnotation: number | SpanAnnotationRead;
}

function SpanAnnotationRenderer({
  spanAnnotation,
  showCode = true,
  showSpanText = true,
  ...props
}: SpanAnnotationRendererProps & SpanAnnotationRendererSharedProps) {
  if (typeof spanAnnotation === "number") {
    return (
      <SpanAnnotationRendererWithoutData
        spanAnnotationId={spanAnnotation}
        showCode={showCode}
        showSpanText={showSpanText}
        {...props}
      />
    );
  } else {
    return (
      <SpanAnnotationRendererWithData
        spanAnnotation={spanAnnotation}
        showCode={showCode}
        showSpanText={showSpanText}
        {...props}
      />
    );
  }
}

function SpanAnnotationRendererWithoutData({
  spanAnnotationId,
  ...props
}: { spanAnnotationId: number } & SpanAnnotationRendererSharedProps) {
  const spanAnnotation = SpanAnnotationHooks.useGetAnnotation(spanAnnotationId);

  if (spanAnnotation.isSuccess) {
    return <SpanAnnotationRendererWithData spanAnnotation={spanAnnotation.data} {...props} />;
  } else if (spanAnnotation.isError) {
    return <div>{spanAnnotation.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

function SpanAnnotationRendererWithData({
  spanAnnotation,
  showCode,
  showSpanText,
  showSdoc,
  showSdocTags,
  showSdocProjectMetadataId,
  sdocRendererProps,
  link,
}: { spanAnnotation: SpanAnnotationRead } & SpanAnnotationRendererSharedProps) {
  const dispatch = useAppDispatch();
  const handleClick = () => {
    dispatch(AnnoActions.setSelectedAnnotationId(spanAnnotation.id));
    dispatch(AnnoActions.setVisibleUserId(spanAnnotation.user_id));
  };
  const content = (
    <Stack direction="row" alignItems="center">
      {showSdoc && <SdocRenderer sdoc={spanAnnotation.sdoc_id} {...sdocRendererProps} />}
      {showSdocTags && <SdocTagsRenderer sdocId={spanAnnotation.sdoc_id} />}
      {showSdocProjectMetadataId && (
        <SdocMetadataRenderer sdocId={spanAnnotation.sdoc_id} projectMetadataId={showSdocProjectMetadataId} />
      )}
      {showCode && <CodeRenderer code={spanAnnotation.code_id} />}
      {showCode && showSpanText && ": "}
      {showSpanText && spanAnnotation.text}
    </Stack>
  );
  if (link) {
    return (
      <Link to={`../annotation/${spanAnnotation.sdoc_id}`} onClick={handleClick}>
        {content}
      </Link>
    );
  }
  return content;
}

export default SpanAnnotationRenderer;
