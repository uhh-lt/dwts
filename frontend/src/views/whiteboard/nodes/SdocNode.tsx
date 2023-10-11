import { CardContent, CardHeader, CardMedia, Divider, MenuItem, Typography } from "@mui/material";
import { intersection } from "lodash";
import { useEffect, useRef } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import SdocHooks from "../../../api/SdocHooks";
import { AttachedObjectType, DocType, SourceDocumentRead } from "../../../api/openapi";
import { useAuth } from "../../../auth/AuthProvider";
import SdocRenderer from "../../../components/DataGrid/SdocRenderer";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu";
import {
  createMemoNodes,
  createMemoSdocEdge,
  createTagNodes,
  createTagSdocEdge,
  isMemoSdocEdge,
  isTagSdocEdge,
} from "../whiteboardUtils";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { DWTSNodeData, SdocNodeData, isMemoNode, isTagNode } from "../types";
import BaseCardNode from "./BaseCardNode";
import MemoAPI from "../../../features/Memo/MemoAPI";

function SdocNode({ id, data, isConnectable, selected, xPos, yPos }: NodeProps<SdocNodeData>) {
  // global client state
  const userId = useAuth().user.data!.id;

  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DWTSNodeData, any>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionContextMenuHandle>(null);

  // global server state (react-query)
  const sdoc = SdocHooks.useGetDocument(data.sdocId);
  const tags = SdocHooks.useGetAllDocumentTags(data.sdocId);
  const memo = SdocHooks.useGetMemo(data.sdocId, userId);

  const docType = sdoc.data?.doctype;

  // effects
  useEffect(() => {
    if (!tags.data) return;
    const tagIds = tags.data.map((tag) => tag.id);

    // checks which edges are already in the graph and removes edges to non-existing tags
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isTagSdocEdge) // isTagEdge
      .filter((edge) => edge.target === `sdoc-${data.sdocId}`) // isEdgeForThisSdoc
      .filter((edge) => !tagIds.includes(parseInt(edge.source.split("-")[1]))); // isEdgeForNonExistingTag
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which tag nodes are already in the graph and adds edges to them
    const existingTagNodeIds = reactFlowInstance
      .getNodes()
      .filter(isTagNode)
      .map((tag) => tag.data.tagId);
    const edgesToAdd = intersection(existingTagNodeIds, tagIds).map((tagId) =>
      createTagSdocEdge({ tagId, sdocId: data.sdocId })
    );
    reactFlowInstance.addEdges(edgesToAdd);
  }, [data.sdocId, reactFlowInstance, tags.data]);

  useEffect(() => {
    if (!memo.data) return;
    const memoId = memo.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoSdocEdge)
      .filter((edge) => edge.target === `sdoc-${data.sdocId}`) // isEdgeForThisSdoc
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== memoId); // isEdgeForIncorrectMemo
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which memo nodes are already in the graph and adds edge to the correct node
    const existingMemoNodeIds = reactFlowInstance
      .getNodes()
      .filter(isMemoNode)
      .map((memo) => memo.data.memoId);
    if (existingMemoNodeIds.includes(memoId)) {
      reactFlowInstance.addEdges([createMemoSdocEdge({ memoId, sdocId: data.sdocId })]);
    }
  }, [data.sdocId, reactFlowInstance, memo.data]);

  const handleContextMenuExpandTags = () => {
    if (!tags.data) return;

    reactFlowService.addNodes(createTagNodes({ tags: tags.data, position: { x: xPos, y: yPos - 200 } }));
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandMemo = () => {
    if (!memo.data) return;

    reactFlowService.addNodes(createMemoNodes({ memos: [memo.data], position: { x: xPos, y: yPos - 200 } }));
    contextMenuRef.current?.close();
  };

  const handleContextMenuCreateMemo = () => {
    if (memo.data) return;

    MemoAPI.openMemo({
      attachedObjectType: AttachedObjectType.SOURCE_DOCUMENT,
      attachedObjectId: data.sdocId,
      onCreateSuccess: (memo) => {
        reactFlowService.addNodes(createMemoNodes({ memos: [memo], position: { x: xPos, y: yPos - 200 } }));
      },
    });
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandAnnotations = () => {
    alert("Not implemented!");
  };

  return (
    <>
      <BaseCardNode
        nodeId={id}
        allowDrawConnection={false}
        selected={selected}
        onContextMenu={(e) => {
          e.preventDefault();
          contextMenuRef.current?.open({
            top: e.clientY,
            left: e.clientX,
          });
        }}
      >
        <CardHeader title={<SdocRenderer sdoc={data.sdocId} link={true} />} />
        <CardContent>
          {sdoc.isSuccess ? (
            <>
              {docType === DocType.IMAGE ? (
                <CardMedia component="img" image={sdoc.data.content} alt="Thumbnail" />
              ) : docType === DocType.TEXT ? (
                <TextPreview sdoc={sdoc.data} />
              ) : (
                <Typography fontSize={8} textAlign={"center"}>
                  DOC TYPE IS NOT SUPPORTED
                </Typography>
              )}
            </>
          ) : sdoc.isError ? (
            <Typography variant="body2">{sdoc.error.message}</Typography>
          ) : (
            <Typography variant="body2">Loading ...</Typography>
          )}
        </CardContent>
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
        <MenuItem onClick={handleContextMenuExpandTags}>Expand document tags ({tags.data?.length || 0})</MenuItem>
        <Divider />
        <MenuItem onClick={handleContextMenuExpandAnnotations}>Expand annotations</MenuItem>
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

function TextPreview({ sdoc }: { sdoc: SourceDocumentRead }) {
  // global server state (react-query)
  const content = SdocHooks.useGetDocumentContent(sdoc.id);

  // rendering
  if (content.isSuccess) {
    return <Typography>{content.data.content.substring(0, 500)}...</Typography>;
  }

  if (content.isError) {
    return <Typography>{content.error.message}</Typography>;
  }

  return <Typography>Loading ...</Typography>;
}

export default SdocNode;
