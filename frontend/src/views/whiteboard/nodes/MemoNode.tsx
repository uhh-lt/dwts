import { CardContent, CardHeader, MenuItem, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { Edge, Node, NodeProps, XYPosition, useReactFlow } from "reactflow";
import MemoHooks from "../../../api/MemoHooks.ts";

import MemoDialogAPI from "../../../components/Memo/MemoDialog/MemoDialogAPI.ts";
import useGetMemosAttachedObject from "../../../components/Memo/useGetMemosAttachedObject.ts";
import { useReactFlowService } from "../hooks/ReactFlowService.ts";

import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationRead } from "../../../api/openapi/models/BBoxAnnotationRead.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead.ts";
import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead.ts";
import GenericPositionMenu, { GenericPositionMenuHandle } from "../../../components/GenericPositionMenu.tsx";
import { attachedObjectTypeToText } from "../../../components/Memo/attachedObjectTypeToText.ts";
import MemoRenderer from "../../../components/Memo/MemoRenderer.tsx";
import { DATSNodeData } from "../types/DATSNodeData.ts";
import { BBoxAnnotationNodeData } from "../types/dbnodes/BBoxAnnotationNodeData.ts";
import { CodeNodeData } from "../types/dbnodes/CodeNodeData.ts";
import { MemoNodeData } from "../types/dbnodes/MemoNodeData.ts";
import { SdocNodeData } from "../types/dbnodes/SdocNodeData.ts";
import { SpanAnnotationNodeData } from "../types/dbnodes/SpanAnnotationNodeData.ts";
import { TagNodeData } from "../types/dbnodes/TagNodeData.ts";
import { isBBoxAnnotationNode, isCodeNode, isSdocNode, isSpanAnnotationNode, isTagNode } from "../types/typeGuards.ts";
import {
  createBBoxAnnotationNodes,
  createCodeNodes,
  createMemoBBoxAnnotationEdge,
  createMemoCodeEdge,
  createMemoSdocEdge,
  createMemoSpanAnnotationEdge,
  createMemoTagEdge,
  createSdocNodes,
  createSpanAnnotationNodes,
  createTagNodes,
  isMemoBBoxAnnotationEdge,
  isMemoCodeEdge,
  isMemoSdocEdge,
  isMemoSpanAnnotationEdge,
  isMemoTagEdge,
} from "../whiteboardUtils.ts";
import BaseCardNode from "./BaseCardNode.tsx";

const isMemoAttachedObjectEdge = (attachedObjectType: AttachedObjectType) => {
  switch (attachedObjectType) {
    case AttachedObjectType.DOCUMENT_TAG:
      return isMemoTagEdge;
    case AttachedObjectType.CODE:
      return isMemoCodeEdge;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return isMemoSdocEdge;
    case AttachedObjectType.SPAN_ANNOTATION:
      return isMemoSpanAnnotationEdge;
    case AttachedObjectType.BBOX_ANNOTATION:
      return isMemoBBoxAnnotationEdge;
    default:
      return () => false;
  }
};

const isAttachedObjectNode = (attachedObjectType: AttachedObjectType) => {
  switch (attachedObjectType) {
    case AttachedObjectType.DOCUMENT_TAG:
      return isTagNode;
    case AttachedObjectType.CODE:
      return isCodeNode;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return isSdocNode;
    case AttachedObjectType.SPAN_ANNOTATION:
      return isSpanAnnotationNode;
    case AttachedObjectType.BBOX_ANNOTATION:
      return isBBoxAnnotationNode;
    default:
      return () => false;
  }
};

const getAttachedObjectNodeId = (attachedObjectType: AttachedObjectType) => (node: Node<DATSNodeData>) => {
  switch (attachedObjectType) {
    case AttachedObjectType.DOCUMENT_TAG:
      return (node as Node<TagNodeData>).data.tagId;
    case AttachedObjectType.CODE:
      return (node as Node<CodeNodeData>).data.codeId;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return (node as Node<SdocNodeData>).data.sdocId;
    case AttachedObjectType.SPAN_ANNOTATION:
      return (node as Node<SpanAnnotationNodeData>).data.spanAnnotationId;
    case AttachedObjectType.BBOX_ANNOTATION:
      return (node as Node<BBoxAnnotationNodeData>).data.bboxAnnotationId;
    default:
      return -1;
  }
};

const createMemoAttachedObjectEdge = (
  attachedObjectType: AttachedObjectType,
  attachedObjectId: number,
  memoId: number,
): Edge | undefined => {
  switch (attachedObjectType) {
    case AttachedObjectType.DOCUMENT_TAG:
      return createMemoTagEdge({
        memoId,
        tagId: attachedObjectId,
      });
    case AttachedObjectType.CODE:
      return createMemoCodeEdge({
        memoId,
        codeId: attachedObjectId,
      });
    case AttachedObjectType.SOURCE_DOCUMENT:
      return createMemoSdocEdge({
        memoId,
        sdocId: attachedObjectId,
      });
    case AttachedObjectType.SPAN_ANNOTATION:
      return createMemoSpanAnnotationEdge({
        memoId,
        spanAnnotationId: attachedObjectId,
      });
    case AttachedObjectType.BBOX_ANNOTATION:
      return createMemoBBoxAnnotationEdge({
        memoId,
        bboxAnnotationId: attachedObjectId,
      });
    default:
      return undefined;
  }
};

const createAttachedObjectNodes = (
  attachedObjectType: AttachedObjectType,
  attachedObject: DocumentTagRead | CodeRead | SpanAnnotationRead | BBoxAnnotationRead | SourceDocumentRead,
  position: XYPosition,
): Node<DATSNodeData>[] => {
  switch (attachedObjectType) {
    case AttachedObjectType.DOCUMENT_TAG:
      return createTagNodes({
        tags: [attachedObject as DocumentTagRead],
        position,
      });
    case AttachedObjectType.CODE:
      return createCodeNodes({
        codes: [attachedObject as CodeRead],
        position,
      });
    case AttachedObjectType.SOURCE_DOCUMENT:
      return createSdocNodes({
        sdocs: [attachedObject as SourceDocumentRead],
        position,
      });
    case AttachedObjectType.SPAN_ANNOTATION:
      return createSpanAnnotationNodes({
        spanAnnotations: [attachedObject as SpanAnnotationRead],
      });
    case AttachedObjectType.BBOX_ANNOTATION:
      return createBBoxAnnotationNodes({
        bboxAnnotations: [attachedObject as BBoxAnnotationRead],
        position,
      });
    default:
      return [];
  }
};

function MemoNode(props: NodeProps<MemoNodeData>) {
  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DATSNodeData>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionMenuHandle>(null);
  const readonly = !props.isConnectable;

  // global server state (react-query)
  const memo = MemoHooks.useGetMemo(props.data.memoId);
  const attachedObject = useGetMemosAttachedObject(memo.data?.attached_object_type)(memo.data?.attached_object_id);

  useEffect(() => {
    if (!memo.data || !attachedObject.data) return;
    const attachedObjectId = attachedObject.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoAttachedObjectEdge(memo.data.attached_object_type))
      .filter((edge) => edge.source === `memo-${props.data.memoId}`) // isEdgeForThisMemo
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== attachedObjectId); // isEdgeForIncorrectAttachedObject
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which attachedObject nodes are already in the graph and adds edge to the correct node
    const existingAttachedObjectNodeIds = reactFlowInstance
      .getNodes()
      .filter(isAttachedObjectNode(memo.data.attached_object_type))
      .map(getAttachedObjectNodeId(memo.data.attached_object_type));

    if (existingAttachedObjectNodeIds.includes(attachedObjectId)) {
      const newEdge = createMemoAttachedObjectEdge(memo.data.attached_object_type, attachedObjectId, props.data.memoId);
      if (newEdge) {
        reactFlowInstance.addEdges(newEdge);
      }
    }
  }, [props.data.memoId, reactFlowInstance, memo.data, attachedObject.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!memo.data) return;

    if (event.detail >= 2) {
      MemoDialogAPI.openMemo({
        memoId: memo.data.id,
        attachedObjectType: memo.data.attached_object_type,
        attachedObjectId: memo.data.attached_object_id,
      });
    }
  };

  const handleContextMenuExpandAttachedObject = () => {
    if (!memo.data || !attachedObject.data) return;

    reactFlowService.addNodes(
      createAttachedObjectNodes(memo.data.attached_object_type, attachedObject.data, {
        x: props.xPos,
        y: props.yPos,
      }),
    );
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
        {memo.isSuccess ? (
          <>
            <CardHeader title={<MemoRenderer memo={memo.data} showIcon showTitle />} />
            <CardContent>
              <Typography>{memo.data.content}</Typography>
            </CardContent>
          </>
        ) : memo.isError ? (
          <Typography variant="body2">{memo.error.message}</Typography>
        ) : (
          <Typography variant="body2">Loading ...</Typography>
        )}
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
        {memo.data && (
          <MenuItem onClick={handleContextMenuExpandAttachedObject} disabled={!attachedObject.data}>
            Expand {attachedObjectTypeToText[memo.data.attached_object_type]}
          </MenuItem>
        )}
      </GenericPositionMenu>
    </>
  );
}

export default MemoNode;
