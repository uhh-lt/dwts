import { Box, CardContent, CardHeader, Divider, MenuItem, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { NodeProps, useReactFlow } from "reactflow";
import CodeHooks from "../../../api/CodeHooks.ts";
import MemoHooks from "../../../api/MemoHooks.ts";
import SentenceAnnotationHooks from "../../../api/SentenceAnnotationHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import CodeRenderer from "../../../components/Code/CodeRenderer.tsx";
import GenericPositionMenu, { GenericPositionMenuHandle } from "../../../components/GenericPositionMenu.tsx";
import MemoDialogAPI from "../../../components/Memo/MemoDialog/MemoDialogAPI.ts";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { AnnoActions } from "../../annotation/annoSlice.ts";
import { useReactFlowService } from "../hooks/ReactFlowService.ts";
import { DATSNodeData } from "../types/DATSNodeData.ts";
import { SentenceAnnotationNodeData } from "../types/dbnodes/SentenceAnnotationNodeData.ts";
import { isCodeNode, isMemoNode, isSdocNode } from "../types/typeGuards.ts";
import {
  createCodeNodes,
  createCodeSentenceAnnotationEdge,
  createMemoNodes,
  createMemoSentenceAnnotationEdge,
  createSdocNodes,
  createSdocSentenceAnnotationEdge,
  isCodeSentenceAnnotationEdge,
  isMemoSentenceAnnotationEdge,
  isSdocSentenceAnnotationEdge,
} from "../whiteboardUtils.ts";
import BaseCardNode from "./BaseCardNode.tsx";

function SentenceAnnotationNode(props: NodeProps<SentenceAnnotationNodeData>) {
  // global client state
  const dispatch = useAppDispatch();

  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DATSNodeData>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionMenuHandle>(null);
  const readonly = !props.isConnectable;

  // global server state (react-query)
  const annotation = SentenceAnnotationHooks.useGetAnnotation(props.data.sentenceAnnotationId);
  const code = CodeHooks.useGetCode(annotation.data?.code_id);
  const memo = MemoHooks.useGetUserMemo(AttachedObjectType.SENTENCE_ANNOTATION, props.data.sentenceAnnotationId);

  // effects
  useEffect(() => {
    if (!code.data) return;
    const codeId = code.data.id;

    // checks which edges are already in the graph and removes edges to non-existing codes
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isCodeSentenceAnnotationEdge)
      .filter((edge) => edge.target === `sentenceAnnotation-${props.data.sentenceAnnotationId}`) // isEdgeForThisSentenceAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== codeId); // isEdgeForIncorrectCode
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which code nodes are already in the graph and adds edges to the correct node
    const existingCodeNodeIds = reactFlowInstance
      .getNodes()
      .filter(isCodeNode)
      .map((code) => code.data.codeId);
    if (existingCodeNodeIds.includes(codeId)) {
      reactFlowInstance.addEdges([
        createCodeSentenceAnnotationEdge({ codeId, sentenceAnnotationId: props.data.sentenceAnnotationId }),
      ]);
    }
  }, [props.data.sentenceAnnotationId, reactFlowInstance, code.data]);

  useEffect(() => {
    if (!annotation.data) return;
    const sdocId = annotation.data.sdoc_id;

    // check which edges are already in the graph and removes edges to non-existing sdocs
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isSdocSentenceAnnotationEdge)
      .filter((edge) => edge.target === `sentenceAnnotation-${props.data.sentenceAnnotationId}`) // isEdgeForThisSentenceAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== sdocId); // isEdgeForIncorrectSdoc
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which sdoc nodes are already in the graph and adds edges to the correct node
    const existingSdocNodeIds = reactFlowInstance
      .getNodes()
      .filter(isSdocNode)
      .map((sdoc) => sdoc.data.sdocId);
    if (existingSdocNodeIds.includes(sdocId)) {
      reactFlowInstance.addEdges([
        createSdocSentenceAnnotationEdge({ sdocId, sentenceAnnotationId: props.data.sentenceAnnotationId }),
      ]);
    }
  }, [props.data.sentenceAnnotationId, reactFlowInstance, annotation.data]);

  useEffect(() => {
    if (!memo.data) return;
    const memoId = memo.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoSentenceAnnotationEdge)
      .filter((edge) => edge.target === `sentenceAnnotation-${props.data.sentenceAnnotationId}`) // isEdgeForThisSentenceAnnotation
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== memoId); // isEdgeForIncorrectMemo
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which memo nodes are already in the graph and adds edge to the correct node
    const existingMemoNodeIds = reactFlowInstance
      .getNodes()
      .filter(isMemoNode)
      .map((memo) => memo.data.memoId);
    if (existingMemoNodeIds.includes(memoId)) {
      reactFlowInstance.addEdges([
        createMemoSentenceAnnotationEdge({ memoId, sentenceAnnotationId: props.data.sentenceAnnotationId }),
      ]);
    }
  }, [props.data.sentenceAnnotationId, reactFlowInstance, memo.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!annotation.data) return;

    if (event.detail >= 2) {
      dispatch(CRUDDialogActions.openSentenceAnnotationEditDialog({ sentenceAnnotationIds: [annotation.data.id] }));
    }
  };

  // context menu actions
  const navigate = useNavigate();
  const handleContextMenuGoToDocument = () => {
    if (!annotation.data) return;

    dispatch(AnnoActions.setSelectedAnnotationId(annotation.data.id));
    dispatch(AnnoActions.setVisibleUserId(annotation.data.user_id));
    navigate(`../annotation/${annotation.data.sdoc_id}`);

    contextMenuRef.current?.close();
  };

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
      attachedObjectType: AttachedObjectType.SPAN_ANNOTATION,
      attachedObjectId: props.data.sentenceAnnotationId,
      onCreateSuccess: (memo) => {
        reactFlowService.addNodes(createMemoNodes({ memos: [memo], position: { x: props.xPos, y: props.yPos - 200 } }));
      },
    });
    contextMenuRef.current?.close();
  };

  return (
    <>
      <BaseCardNode
        allowDrawConnection={false}
        nodeProps={props}
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
            <CardContent>
              <Typography>
                This annotation spans sentence {annotation.data.sentence_id_start + 1} to{" "}
                {annotation.data.sentence_id_end + 1}
              </Typography>
            </CardContent>
          </>
        ) : annotation.isError ? (
          <>{annotation.error.message}</>
        ) : (
          <>Loading...</>
        )}
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
        <MenuItem onClick={handleContextMenuGoToDocument}>Go to document</MenuItem>
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

export default SentenceAnnotationNode;
