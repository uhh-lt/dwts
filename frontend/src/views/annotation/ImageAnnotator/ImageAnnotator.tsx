import {
  AnnotationDocumentRead,
  BBoxAnnotationReadResolvedCode,
  SourceDocumentRead,
  SpanAnnotationReadResolved,
} from "../../../api/openapi";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Button, ButtonGroup, Toolbar, Typography } from "@mui/material";
import SpanContextMenu, { CodeSelectorHandle } from "../SpanContextMenu/SpanContextMenu";
import { ICode } from "../TextAnnotator/ICode";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import SVGBBox from "./SVGBBox";
import SVGBBoxText from "./SVGBBoxText";
import AdocHooks from "../../../api/AdocHooks";

interface ImageAnnotatorProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead | null;
  height: number;
}

function ImageAnnotator({ sdoc, adoc, height }: ImageAnnotatorProps) {
  // references to svg elements
  const svgRef = useRef<SVGSVGElement>(null);
  const gZoomRef = useRef<SVGGElement>(null);
  const gDragRef = useRef<SVGGElement>(null);
  const rectRef = useRef<SVGRectElement>(null);
  const imgRef = useRef<SVGImageElement>(null);
  const codeSelectorRef = useRef<CodeSelectorHandle>(null);

  // global client state (redux)
  const visibleAdocIds = useAppSelector((state) => state.annotations.visibleAdocIds);
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);

  // global server state (react query)
  const annotationsBatch = AdocHooks.useGetAllBboxAnnotationsBatch(visibleAdocIds);

  // computed
  const annotations = useMemo(() => {
    const annotationsIsUndefined = annotationsBatch.some((a) => !a.data);
    if (annotationsIsUndefined) return undefined;
    return annotationsBatch.map((a) => a.data!).flat();
  }, [annotationsBatch]);

  const data = useMemo(() => {
    return (annotations || []).filter((bbox) => !hiddenCodeIds.includes(bbox.code.id));
  }, [annotations, hiddenCodeIds]);

  // local client state
  const [isZooming, setIsZooming] = useState(true);
  const [selectedBbox, setSelectedBbox] = useState<BBoxAnnotationReadResolvedCode | null>(null);

  // mutations for create, update, delete
  const createMutation = BboxAnnotationHooks.useCreateAnnotation();
  const updateMutation = BboxAnnotationHooks.useUpdate();
  const deleteMutation = BboxAnnotationHooks.useDelete();

  // right click (contextmenu) handling
  const handleRightClick = useCallback(
    (event: any, d: BBoxAnnotationReadResolvedCode) => {
      event.preventDefault();
      const rect = event.target.getBoundingClientRect();
      const position = {
        left: rect.left,
        top: rect.top + rect.height,
      };
      codeSelectorRef.current!.open(position, [d]);
      setSelectedBbox(d);
    },
    [codeSelectorRef]
  );

  // drag handling
  const drag = useMemo(() => d3.drag<SVGGElement, unknown>(), []);

  const handleDragStart = (event: d3.D3DragEvent<any, any, any>, d: any) => {
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

  const handleDrag = (event: d3.D3DragEvent<any, any, any>, d: any) => {
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

  const handleDragEnd = (event: d3.D3DragEvent<any, any, any>, d: any) => {
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

  const handleZoom = useCallback((e: d3.D3ZoomEvent<any, any>) => {
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
    if (adoc) {
      const myRect = d3.select(rectRef.current);
      const x = parseInt(myRect.attr("x"));
      const y = parseInt(myRect.attr("y"));
      const width = parseInt(myRect.attr("width"));
      const height = parseInt(myRect.attr("height"));
      createMutation.mutate(
        {
          requestBody: {
            code_id: code.id,
            annotation_document_id: adoc.id,
            x_min: x,
            x_max: x + width,
            y_min: y,
            y_max: y + height,
          },
        },
        {
          onSuccess: (bboxAnnotation) => {
            SnackbarAPI.openSnackbar({
              text: `Created Bounding Box Annotation ${bboxAnnotation.id}`,
              severity: "success",
            });
          },
        }
      );
      // console.log("Add", code);
      // console.log(`drag end: {x: ${x}, y: ${y}, width: ${width}, height: ${height}}`);
    } else {
      console.error("This should never happen! (onCodeSelectorAddCode)");
    }
  };

  const onCodeSelectorEditCode = (
    annotationToEdit: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode,
    code: ICode
  ) => {
    if (selectedBbox) {
      updateMutation.mutate(
        {
          bboxToUpdate: selectedBbox,
          resolve: true,
          requestBody: {
            code_id: code.id,
            x_min: selectedBbox.x_min,
            x_max: selectedBbox.x_max,
            y_min: selectedBbox.y_min,
            y_max: selectedBbox.y_max,
          },
        },
        {
          onSuccess: (updatedBboxAnnotation) => {
            SnackbarAPI.openSnackbar({
              text: `Updated Bounding Box Annotation ${updatedBboxAnnotation.id}`,
              severity: "success",
            });
          },
        }
      );
      // console.log("Edit", code);
    } else {
      console.error("This should never happen! (onCodeSelectorEditCode)");
    }
  };

  const onCodeSelectorDeleteCode = () => {
    if (selectedBbox) {
      deleteMutation.mutate(
        { bboxToDelete: selectedBbox },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: `Deleted Bounding Box Annotation ${data.id}`,
              severity: "success",
            });
          },
        }
      );
      // console.log("Delete", code);
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
            ? "Try to drag the image & use mouse wheel to zoom. Right click boxes to edit annotations."
            : "Drag to create annotations. Right click boxes to edit annotations."}
        </Typography>
      </Toolbar>

      <SpanContextMenu
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
            <image ref={imgRef} href={sdoc.content} style={{ outline: "1px solid black" }} />
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
              <SVGBBox key={bbox.id} bbox={bbox} onContextMenu={handleRightClick} />
            ))}
          </g>
          <g>
            {data.map((bbox) => (
              <SVGBBoxText
                key={bbox.id}
                bbox={bbox}
                onContextMenu={handleRightClick}
                fontSize={Math.max(21, height / 17)}
              />
            ))}
          </g>
        </g>
      </svg>
    </>
  );
}

export default ImageAnnotator;
