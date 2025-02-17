import { CardContent, CardHeader, Divider, MenuItem, Typography } from "@mui/material";
import { intersection } from "lodash";
import { useEffect, useRef } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import MemoHooks from "../../../api/MemoHooks.ts";
import SdocHooks from "../../../api/SdocHooks.ts";
import TagHooks from "../../../api/TagHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import GenericPositionMenu, { GenericPositionMenuHandle } from "../../../components/GenericPositionMenu.tsx";
import MemoDialogAPI from "../../../components/Memo/MemoDialog/MemoDialogAPI.ts";
import TagRenderer from "../../../components/Tag/TagRenderer.tsx";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { useReactFlowService } from "../hooks/ReactFlowService.ts";
import { DATSNodeData } from "../types/DATSNodeData.ts";
import { TagNodeData } from "../types/dbnodes/TagNodeData.ts";
import { isMemoNode, isSdocNode } from "../types/typeGuards.ts";
import {
  createMemoNodes,
  createMemoTagEdge,
  createSdocNodes,
  createTagSdocEdge,
  isMemoTagEdge,
  isTagSdocEdge,
} from "../whiteboardUtils.ts";
import BaseCardNode from "./BaseCardNode.tsx";

function TagNode(props: NodeProps<TagNodeData>) {
  // global client state
  const dispatch = useAppDispatch();

  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DATSNodeData>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionMenuHandle>(null);
  const readonly = !props.isConnectable;

  // global server state (react-query)
  const tag = TagHooks.useGetTag(props.data.tagId);
  const sdocIds = SdocHooks.useGetSdocIdsByTagId(props.data.tagId);
  const memo = MemoHooks.useGetUserMemo(AttachedObjectType.DOCUMENT_TAG, props.data.tagId);

  // effects
  useEffect(() => {
    if (!sdocIds.data) return;

    // checks which edges are already in the graph and removes edges to non-existing sdocs
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isTagSdocEdge)
      .filter((edge) => edge.source === `tag-${props.data.tagId}`) // isEdgeForThisTag
      .filter((edge) => !sdocIds.data.includes(parseInt(edge.target.split("-")[1]))); // isEdgeForNonExistingSdoc
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    //  checks which sdoc nodes are already in the graph and adds edges to them
    const existingSdocNodeIds = reactFlowInstance
      .getNodes()
      .filter(isSdocNode)
      .map((sdoc) => sdoc.data.sdocId);
    const edgesToAdd = intersection(existingSdocNodeIds, sdocIds.data).map((sdocId) =>
      createTagSdocEdge({ tagId: props.data.tagId, sdocId }),
    );
    reactFlowInstance.addEdges(edgesToAdd);
  }, [props.data.tagId, reactFlowInstance, sdocIds.data]);

  useEffect(() => {
    if (!memo.data) return;
    const memoId = memo.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoTagEdge)
      .filter((edge) => edge.target === `tag-${props.data.tagId}`) // isEdgeForThisTag
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== memoId); // isEdgeForIncorrectMemo
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which memo nodes are already in the graph and adds edge to the correct node
    const existingMemoNodeIds = reactFlowInstance
      .getNodes()
      .filter(isMemoNode)
      .map((memo) => memo.data.memoId);
    if (existingMemoNodeIds.includes(memoId)) {
      reactFlowInstance.addEdges([createMemoTagEdge({ memoId, tagId: props.data.tagId })]);
    }
  }, [props.data.tagId, reactFlowInstance, memo.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.detail >= 2) {
      dispatch(CRUDDialogActions.openTagEditDialog({ tagId: props.data.tagId }));
    }
  };

  const handleContextMenuExpandDocuments = () => {
    if (!sdocIds.data) return;
    reactFlowService.addNodes(
      createSdocNodes({ sdocs: sdocIds.data, position: { x: props.xPos, y: props.yPos - 200 } }),
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
      attachedObjectType: AttachedObjectType.DOCUMENT_TAG,
      attachedObjectId: props.data.tagId,
      onCreateSuccess: (memo) => {
        reactFlowService.addNodes(createMemoNodes({ memos: [memo], position: { x: props.xPos, y: props.yPos - 200 } }));
      },
    });
    contextMenuRef.current?.close();
  };

  return (
    <>
      <BaseCardNode
        allowDrawConnection={true}
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
        {tag.isSuccess ? (
          <>
            <CardHeader title={<TagRenderer tag={tag.data} />} />
            <CardContent>
              <Typography>{tag.data.description}</Typography>
            </CardContent>
          </>
        ) : tag.isError ? (
          <>{tag.error.message}</>
        ) : (
          <>Loading...</>
        )}
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
        <MenuItem onClick={handleContextMenuExpandDocuments}>Expand documents ({sdocIds.data?.length || 0})</MenuItem>
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

export default TagNode;
