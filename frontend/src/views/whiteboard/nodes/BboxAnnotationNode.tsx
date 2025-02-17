import { Box, CardContent, CardHeader, Divider, MenuItem, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks.ts";
import CodeHooks from "../../../api/CodeHooks.ts";
import MemoHooks from "../../../api/MemoHooks.ts";
import SdocHooks from "../../../api/SdocHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import CodeRenderer from "../../../components/Code/CodeRenderer.tsx";
import GenericPositionMenu, { GenericPositionMenuHandle } from "../../../components/GenericPositionMenu.tsx";
import MemoDialogAPI from "../../../components/Memo/MemoDialog/MemoDialogAPI.ts";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { useReactFlowService } from "../hooks/ReactFlowService.ts";
import { DATSNodeData } from "../types/DATSNodeData.ts";
import { BBoxAnnotationNodeData } from "../types/dbnodes/BBoxAnnotationNodeData.ts";
import { isCodeNode, isMemoNode, isSdocNode } from "../types/typeGuards.ts";
import {
  createCodeBBoxAnnotationEdge,
  createCodeNodes,
  createMemoBBoxAnnotationEdge,
  createMemoNodes,
  createSdocBBoxAnnotationEdge,
  createSdocNodes,
  isCodeBBoxAnnotationEdge,
  isMemoBBoxAnnotationEdge,
  isSdocBBoxAnnotationEdge,
} from "../whiteboardUtils.ts";
import BaseCardNode from "./BaseCardNode.tsx";
import ImageCropper from "./ImageCropper.tsx";

function BboxAnnotationNode(props: NodeProps<BBoxAnnotationNodeData>) {
  // global client state
  const dispatch = useAppDispatch();

  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DATSNodeData>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionMenuHandle>(null);
  const readonly = !props.isConnectable;

  // global server state (react-query)
  const annotation = BboxAnnotationHooks.useGetAnnotation(props.data.bboxAnnotationId);
  const code = CodeHooks.useGetCode(annotation.data?.code_id);
  const sdocData = SdocHooks.useGetDocumentData(annotation.data?.sdoc_id);
  const memo = MemoHooks.useGetUserMemo(AttachedObjectType.BBOX_ANNOTATION, props.data.bboxAnnotationId);

  // effects
  useEffect(() => {
    if (!code.data) return;
    const codeId = code.data.id;

    // checks which edges are already in the graph and removes edges to non-existing codes
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isCodeBBoxAnnotationEdge)
      .filter((edge) => edge.target === `bboxAnnotation-${props.data.bboxAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== codeId); // isEdgeForIncorrectCode
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which code nodes are already in the graph and adds edges to the correct node
    const existingCodeNodeIds = reactFlowInstance
      .getNodes()
      .filter(isCodeNode)
      .map((code) => code.data.codeId);
    if (existingCodeNodeIds.includes(codeId)) {
      reactFlowInstance.addEdges([
        createCodeBBoxAnnotationEdge({ codeId, bboxAnnotationId: props.data.bboxAnnotationId }),
      ]);
    }
  }, [props.data.bboxAnnotationId, reactFlowInstance, code.data]);

  useEffect(() => {
    if (!annotation.data) return;
    const sdocId = annotation.data.sdoc_id;

    // check which edges are already in the graph and removes edges to non-existing sdocs
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isSdocBBoxAnnotationEdge)
      .filter((edge) => edge.target === `bboxAnnotation-${props.data.bboxAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== sdocId); // isEdgeForIncorrectSdoc
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which sdoc nodes are already in the graph and adds edges to the correct node
    const existingSdocNodeIds = reactFlowInstance
      .getNodes()
      .filter(isSdocNode)
      .map((sdoc) => sdoc.data.sdocId);
    if (existingSdocNodeIds.includes(sdocId)) {
      reactFlowInstance.addEdges([
        createSdocBBoxAnnotationEdge({ sdocId, bboxAnnotationId: props.data.bboxAnnotationId }),
      ]);
    }
  }, [props.data.bboxAnnotationId, reactFlowInstance, annotation.data]);

  useEffect(() => {
    if (!memo.data) return;
    const memoId = memo.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoBBoxAnnotationEdge)
      .filter((edge) => edge.target === `bboxAnnotation-${props.data.bboxAnnotationId}`) // isEdgeForThisSpanAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== memoId); // isEdgeForIncorrectMemo
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which memo nodes are already in the graph and adds edge to the correct node
    const existingMemoNodeIds = reactFlowInstance
      .getNodes()
      .filter(isMemoNode)
      .map((memo) => memo.data.memoId);
    if (existingMemoNodeIds.includes(memoId)) {
      reactFlowInstance.addEdges([
        createMemoBBoxAnnotationEdge({ memoId, bboxAnnotationId: props.data.bboxAnnotationId }),
      ]);
    }
  }, [props.data.bboxAnnotationId, reactFlowInstance, memo.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!annotation.data) return;

    if (event.detail >= 2) {
      dispatch(CRUDDialogActions.openBBoxAnnotationEditDialog({ annotation: annotation.data }));
    }
  };

  // context menu actions
  const handleContextMenuExpandDocument = () => {
    if (!annotation.data) return;

    reactFlowService.addNodes(
      createSdocNodes({ sdocs: [annotation.data.sdoc_id], position: { x: props.xPos, y: props.yPos - 200 } }),
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandCode = () => {
    if (!code.data) return;

    reactFlowService.addNodes(
      createCodeNodes({ codes: [code.data], position: { x: props.xPos, y: props.yPos - 200 } }),
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandMemo = () => {
    if (!memo.data) return;

    reactFlowService.addNodes(
      createMemoNodes({ memos: [memo.data], position: { x: props.xPos, y: props.yPos - 200 } }),
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuCreateMemo = () => {
    if (memo.data) return;

    MemoDialogAPI.openMemo({
      attachedObjectType: AttachedObjectType.BBOX_ANNOTATION,
      attachedObjectId: props.data.bboxAnnotationId,
      onCreateSuccess: (memo) => {
        reactFlowService.addNodes(createMemoNodes({ memos: [memo], position: { x: props.xPos, y: props.yPos - 200 } }));
      },
    });
    contextMenuRef.current?.close();
  };

  return (
    <>
      <BaseCardNode
        nodeProps={props}
        allowDrawConnection={false}
        onClick={readonly ? undefined : handleClick}
        onContextMenu={
          readonly
            ? undefined
            : (e) => {
                e.preventDefault();
                contextMenuRef.current?.open({
                  top: e.clientY,
                  left: e.clientX,
                });
              }
        }
        backgroundColor={props.data.bgcolor + props.data.bgalpha?.toString(16).padStart(2, "0")}
      >
        {annotation.isSuccess ? (
          <>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center">
                  <CodeRenderer code={annotation.data.code_id} />
                  <Box sx={{ ml: 1 }}>Annotation</Box>
                </Stack>
              }
            />
            <CardContent className="bbox-content" style={{ padding: 2, textAlign: "center" }}>
              {annotation.isSuccess && sdocData.isSuccess && code.data ? (
                <ImageCropper
                  imageUrl={encodeURI(import.meta.env.VITE_APP_CONTENT + "/" + sdocData.data?.html)}
                  x={annotation.data.x_min}
                  y={annotation.data.y_min}
                  width={annotation.data.x_max - annotation.data.x_min}
                  targetWidth={annotation.data.x_max - annotation.data.x_min}
                  height={annotation.data.y_max - annotation.data.y_min}
                  targetHeight={annotation.data.y_max - annotation.data.y_min}
                  style={{
                    border: "4px solid " + code.data.color,
                  }}
                />
              ) : annotation.isError || sdocData.isError ? (
                <Typography variant="body2">Error!</Typography>
              ) : (
                <Typography variant="body2">Loading ...</Typography>
              )}
            </CardContent>
          </>
        ) : annotation.isError ? (
          <>{annotation.error.message}</>
        ) : (
          <>Loading...</>
        )}
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
        <MenuItem onClick={handleContextMenuExpandDocument}>Expand document</MenuItem>
        <Divider />
        <MenuItem onClick={handleContextMenuExpandCode}>Expand code</MenuItem>
        <Divider />
        {memo.data ? (
          <MenuItem onClick={handleContextMenuExpandMemo}>Expand memo</MenuItem>
        ) : (
          <MenuItem onClick={handleContextMenuCreateMemo}>Create memo</MenuItem>
        )}
      </GenericPositionMenu>
    </>
  );
}

export default BboxAnnotationNode;
