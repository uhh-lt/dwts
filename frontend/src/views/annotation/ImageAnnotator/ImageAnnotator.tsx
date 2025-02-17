import { Button, ButtonGroup, Toolbar, Typography } from "@mui/material";
import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks.ts";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { BBoxAnnotationRead } from "../../../api/openapi/models/BBoxAnnotationRead.ts";
import { SourceDocumentDataRead } from "../../../api/openapi/models/SourceDocumentDataRead.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { Annotation } from "../Annotation.ts";
import AnnotationMenu, { CodeSelectorHandle } from "../AnnotationMenu/AnnotationMenu.tsx";
import { ICode } from "../ICode.ts";
import SVGBBox from "./SVGBBox.tsx";
import SVGBBoxText from "./SVGBBoxText.tsx";

interface ImageAnnotatorProps {
  sdocData: SourceDocumentDataRead;
}

function ImageAnnotator(props: ImageAnnotatorProps) {
  const heightMetadata = MetadataHooks.useGetSdocMetadataByKey(props.sdocData.id, "height");

  if (heightMetadata.isSuccess) {
    return <ImageAnnotatorWithHeight sdocData={props.sdocData} height={heightMetadata.data.int_value!} />;
  } else if (heightMetadata.isError) {
    return <div>{heightMetadata.error.message}</div>;
  } else if (heightMetadata.isLoading) {
    return <div>Loading...</div>;
  } else {
    return <>Something went wrong!</>;
  }
}

function ImageAnnotatorWithHeight({ sdocData, height }: ImageAnnotatorProps & { height: number }) {
  // references to svg elements
  const svgRef = useRef<SVGSVGElement>(null);
  const gZoomRef = useRef<SVGGElement>(null);
  const gDragRef = useRef<SVGGElement>(null);
  const rectRef = useRef<SVGRectElement>(null);
  const imgRef = useRef<SVGImageElement>(null);
  const codeSelectorRef = useRef<CodeSelectorHandle>(null);

  // global client state (redux)
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);

  // global server state (react query)
  const annotations = BboxAnnotationHooks.useGetBBoxAnnotationsBatch(sdocData.id, visibleUserId);

  // computed (filter hidden code ids)
  const data = useMemo(() => {
    return (annotations.data || []).filter((bbox) => !hiddenCodeIds.includes(bbox.code_id));
  }, [annotations.data, hiddenCodeIds]);

  // local client state
  const [isZooming, setIsZooming] = useState(true);
  const [selectedBbox, setSelectedBbox] = useState<BBoxAnnotationRead | null>(null);

  // mutations for create, update, delete
  const createMutation = BboxAnnotationHooks.useCreateBBoxAnnotation();
  const updateMutation = BboxAnnotationHooks.useUpdateBBoxAnnotation();
  const deleteMutation = BboxAnnotationHooks.useDeleteBBoxAnnotation();

  // click handling
  const handleClick = useCallback(
    (
      event: React.MouseEvent<SVGRectElement, MouseEvent> | React.MouseEvent<SVGTextElement, MouseEvent>,
      bbox: BBoxAnnotationRead,
    ) => {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const position = {
        left: rect.left,
        top: rect.top + rect.height,
      };
      codeSelectorRef.current!.open(position, [bbox]);
      setSelectedBbox(bbox);
    },
    [codeSelectorRef],
  );

  // drag handling
  const drag = useMemo(() => d3.drag<SVGGElement, unknown>(), []);

  const handleDragStart = (event: d3.D3DragEvent<SVGGElement, unknown, unknown>) => {
    if (!rectRef.current) return;

    const myRect = d3.select(rectRef.current);
    myRect
      .attr("xOrigin", event.x)
      .attr("yOrigin", event.y)
      .attr("x", event.x)
      .attr("width", 0)
      .attr("y", event.y)
      .attr("height", 0);
  };

  const handleDrag = (event: d3.D3DragEvent<SVGGElement, unknown, unknown>) => {
    if (!rectRef.current) return;

    const myRect = d3.select(rectRef.current);
    const myImage = d3.select(imgRef.current).node()!.getBBox();

    const x = parseInt(myRect.attr("xOrigin"));
    const y = parseInt(myRect.attr("yOrigin"));
    const w = Math.abs(event.x - x);
    const h = Math.abs(event.y - y);

    if (event.x < x && event.y < y) {
      const maxWidth = x;
      const maxHeight = y;
      myRect
        .attr("y", Math.max(0, y - h))
        .attr("x", Math.max(0, x - w))
        .attr("width", Math.min(w, maxWidth))
        .attr("height", Math.min(h, maxHeight));
    } else if (event.x < x) {
      const maxWidth = x;
      const maxHeight = myImage.height - y;
      myRect
        .attr("x", Math.max(0, x - w))
        .attr("width", Math.min(w, maxWidth))
        .attr("height", Math.min(h, maxHeight));
    } else if (event.y < y) {
      const maxWidth = myImage.width - x;
      const maxHeight = y;
      myRect
        .attr("width", Math.min(w, maxWidth))
        .attr("y", Math.max(0, y - h))
        .attr("height", Math.min(h, maxHeight));
    } else {
      const maxWidth = myImage.width - x;
      const maxHeight = myImage.height - y;
      myRect.attr("width", Math.min(w, maxWidth)).attr("height", Math.min(h, maxHeight));
    }
  };

  const handleDragEnd = () => {
    const myRect = d3.select(rectRef.current);
    const width = parseInt(myRect.attr("width"));
    const height = parseInt(myRect.attr("height"));

    // only open the code selector if the rect is big enough
    if (width > 10 && height > 10) {
      const boundingBox = myRect.node()!.getBoundingClientRect();
      const position = {
        left: boundingBox.left,
        top: boundingBox.top + boundingBox.height,
      };
      codeSelectorRef.current!.open(position);
    } else {
      resetRect();
    }
  };

  const resetRect = () => {
    const myRect = d3.select(rectRef.current);
    myRect.attr("width", 0).attr("height", 0);
  };

  // zoom handling
  const zoom = useMemo(() => d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 5]), []);

  const handleZoom = useCallback((e: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
    d3.select(gZoomRef.current).attr("transform", e.transform.toString());
  }, []);

  // init component, so that zoom is default
  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select<SVGSVGElement, unknown>(svgRef.current!);
      zoom.on("zoom", handleZoom);
      svg.call(zoom);
    }
  }, [zoom, svgRef, handleZoom]);

  // button handlers
  const toggleZoom = () => {
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current!);
    const gDrag = d3.select<SVGGElement, unknown>(gDragRef.current!);

    if (isZooming) {
      svg.on(".zoom", null);

      drag.on("start", handleDragStart);
      drag.on("drag", handleDrag);
      drag.on("end", handleDragEnd);
      gDrag.call(drag);
    } else {
      gDrag.on(".drag", null);

      zoom.on("zoom", handleZoom);
      svg.call(zoom);
    }
    setIsZooming(!isZooming);
  };

  const resetZoom = () => {
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current!);
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  };

  // code selector events
  const onCodeSelectorAddCode = (code: ICode) => {
    const myRect = d3.select(rectRef.current);
    const x = parseInt(myRect.attr("x"));
    const y = parseInt(myRect.attr("y"));
    const width = parseInt(myRect.attr("width"));
    const height = parseInt(myRect.attr("height"));
    createMutation.mutate({
      code_id: code.id,
      sdoc_id: sdocData.id,
      x_min: x,
      x_max: x + width,
      y_min: y,
      y_max: y + height,
    });
  };

  const onCodeSelectorEditCode = (_annotationToEdit: Annotation, code: ICode) => {
    if (selectedBbox) {
      updateMutation.mutate({
        bboxToUpdate: selectedBbox,
        requestBody: {
          code_id: code.id,
        },
      });
    } else {
      console.error("This should never happen! (onCodeSelectorEditCode)");
    }
  };

  const onCodeSelectorDeleteCode = () => {
    if (selectedBbox) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to remove the BBoxAnnotation ${selectedBbox.id}? You can reassign it later!`,
        onAccept: () => {
          deleteMutation.mutate({ bboxToDelete: selectedBbox });
        },
      });
    } else {
      console.error("This should never happen! (onCodeSelectorDeleteCode)");
    }
  };

  const onCodeSelectorClose = () => {
    resetRect(); // reset selection
    setSelectedBbox(null); // reset selected bounding box
  };

  return (
    <>
      <Toolbar variant="dense" disableGutters>
        <ButtonGroup>
          <Button onClick={() => toggleZoom()} variant={isZooming ? "contained" : "outlined"}>
            Zoom
          </Button>
          <Button onClick={() => toggleZoom()} variant={!isZooming ? "contained" : "outlined"}>
            Annotate
          </Button>
        </ButtonGroup>
        <Button onClick={() => resetZoom()} variant="outlined" sx={{ ml: 2, flexShrink: 0 }}>
          Reset Zoom
        </Button>
        <Typography variant="body1" component="div" sx={{ ml: 2 }}>
          Hint:{" "}
          {isZooming
            ? "Try to drag the image & use mouse wheel to zoom. Click boxes to edit annotations."
            : "Drag to create annotations. Click boxes to edit annotations."}
        </Typography>
      </Toolbar>

      <AnnotationMenu
        ref={codeSelectorRef}
        onAdd={onCodeSelectorAddCode}
        onEdit={onCodeSelectorEditCode}
        onDelete={onCodeSelectorDeleteCode}
        onClose={onCodeSelectorClose}
      />
      <svg
        ref={svgRef}
        width="100%"
        height={Math.max(500, height) + "px"}
        style={{ cursor: isZooming ? "move" : "auto" }}
      >
        <g ref={gZoomRef}>
          <g ref={gDragRef} style={{ cursor: isZooming ? "move" : "crosshair" }}>
            <image
              ref={imgRef}
              href={encodeURI(import.meta.env.VITE_APP_CONTENT + "/" + sdocData.repo_url)}
              style={{ outline: "1px solid black" }}
            />
            <rect
              ref={rectRef}
              x={0}
              y={0}
              stroke={"black"}
              strokeWidth={3}
              fill={"transparent"}
              width={0}
              height={0}
            ></rect>
          </g>
          <g>
            {data.map((bbox) => (
              <SVGBBox
                key={bbox.id}
                bbox={bbox}
                onClick={(event) => handleClick(event, bbox)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </g>
          <g>
            {data.map((bbox) => (
              <SVGBBoxText
                key={bbox.id}
                bbox={bbox}
                onClick={(event) => handleClick(event, bbox)}
                fontSize={`${Math.max(21, height / 17)}px`}
                style={{ cursor: "pointer" }}
              />
            ))}
          </g>
        </g>
      </svg>
    </>
  );
}

export default ImageAnnotator;
