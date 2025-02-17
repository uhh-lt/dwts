import SearchIcon from "@mui/icons-material/Search";
import { Box, Button } from "@mui/material";
import * as d3 from "d3";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks.ts";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { SourceDocumentDataRead } from "../../../api/openapi/models/SourceDocumentDataRead.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { ImageSearchActions } from "../../search/ImageSearch/imageSearchSlice.ts";
import SVGBBox from "../ImageAnnotator/SVGBBox.tsx";
import SVGBBoxText from "../ImageAnnotator/SVGBBoxText.tsx";

interface ImageViewerProps {
  sdocData: SourceDocumentDataRead;
}

function ImageViewer(props: ImageViewerProps) {
  const heightMetadata = MetadataHooks.useGetSdocMetadataByKey(props.sdocData.id, "height");
  const widthMetadata = MetadataHooks.useGetSdocMetadataByKey(props.sdocData.id, "width");

  if (heightMetadata.isSuccess && widthMetadata.isSuccess) {
    return (
      <ImageViewerWithData {...props} height={heightMetadata.data.int_value!} width={widthMetadata.data.int_value!} />
    );
  } else if (heightMetadata.isError) {
    return <div>{heightMetadata.error.message}</div>;
  } else if (widthMetadata.isError) {
    return <div>{widthMetadata.error.message}</div>;
  } else if (heightMetadata.isLoading || widthMetadata.isLoading) {
    return <div>Loading...</div>;
  } else {
    return <>Something went wrong!</>;
  }
}

function ImageViewerWithData({ sdocData, height, width }: ImageViewerProps & { height: number; width: number }) {
  const gRef = useRef<SVGGElement>(null);
  const imgRef = useRef<SVGImageElement>(null);

  const imgContainerHeight = 500;

  // global client state (redux)
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);

  // global server state (react query)
  const annotations = BboxAnnotationHooks.useGetBBoxAnnotationsBatch(sdocData.id, visibleUserId);

  const annotationData = useMemo(() => {
    return (annotations.data || []).filter((bbox) => !hiddenCodeIds.includes(bbox.code_id));
  }, [annotations.data, hiddenCodeIds]);

  // zoom handling
  const zoom = useMemo(() => d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 5]), []);

  const handleZoom = useCallback((e: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
    d3.select(gRef.current).attr("transform", e.transform.toString());
  }, []);

  // image positioning
  const [svgWidth, setSVGWidth] = useState(0);
  const measuredRef = useCallback(
    (node: SVGSVGElement) => {
      if (node !== null) {
        setSVGWidth(node.clientWidth);

        const svg = d3.select<SVGSVGElement, unknown>(node);
        zoom.on("zoom", handleZoom);
        svg.call(zoom);
      }
    },
    [handleZoom, zoom],
  );
  const scaledRatio = imgContainerHeight / height;
  const xCentering = svgWidth / 2 - (width * scaledRatio) / 2;

  // find similar images
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const handleImageSimilaritySearch = () => {
    dispatch(ImageSearchActions.onChangeSearchQuery(sdocData.id));
    navigate("../imagesearch");
  };

  return (
    <Box>
      <Button variant="outlined" onClick={handleImageSimilaritySearch} startIcon={<SearchIcon />} sx={{ mb: 2 }}>
        Find similar images
      </Button>
      <svg ref={measuredRef} width="100%" height={imgContainerHeight + "px"} style={{ cursor: "move" }}>
        <g ref={gRef}>
          <image
            ref={imgRef}
            href={encodeURI(import.meta.env.VITE_APP_CONTENT + "/" + sdocData.repo_url)}
            height={imgContainerHeight}
            x={xCentering}
          />
          <g>
            {annotationData.map((bbox) => (
              <SVGBBox
                key={bbox.id}
                bbox={bbox}
                style={{ cursor: "pointer" }}
                scaledRatio={scaledRatio}
                xCentering={xCentering}
              />
            ))}
          </g>
          <g>
            {annotationData.map((bbox) => (
              <SVGBBoxText
                key={bbox.id}
                bbox={bbox}
                fontSize={`${Math.max(21, height / 17)}px`}
                style={{ cursor: "pointer" }}
                scaledRatio={scaledRatio}
                xCentering={xCentering}
              />
            ))}
          </g>
        </g>
      </svg>
    </Box>
  );
}

export default ImageViewer;
