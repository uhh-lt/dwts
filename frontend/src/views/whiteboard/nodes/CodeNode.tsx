import { CardContent, CardHeader, Divider, MenuItem, Typography } from "@mui/material";
import { useEffect, useMemo, useRef } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import CodeHooks from "../../../api/CodeHooks";
import { useAuth } from "../../../auth/AuthProvider";
import CodeRenderer from "../../../components/DataGrid/CodeRenderer";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu";
import {
  createBBoxAnnotationNodes,
  createCodeNodes,
  createCodeParentCodeEdge,
  createMemoCodeEdge,
  createMemoNodes,
  createSpanAnnotationNodes,
  isCodeParentCodeEdge,
  isMemoCodeEdge,
} from "../whiteboardUtils";
import { useReactFlowService } from "../hooks/ReactFlowService";
import { CodeNodeData, DWTSNodeData, isCodeNode, isMemoNode } from "../types";
import BaseCardNode from "./BaseCardNode";
import { openCodeEditDialog } from "../../../features/CrudDialog/Code/CodeEditDialog";
import { openCodeCreateDialog } from "../../../features/CrudDialog/Code/CodeCreateDialog";
import { SYSTEM_USER_ID } from "../../../utils/GlobalConstants";
import MemoAPI from "../../../features/Memo/MemoAPI";
import { AttachedObjectType } from "../../../api/openapi";
import ProjectHooks from "../../../api/ProjectHooks";
import { useParams } from "react-router-dom";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks";

function CodeNode(props: NodeProps<CodeNodeData>) {
  // global client state
  const userId = useAuth().user.data!.id;
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // whiteboard state (react-flow)
  const reactFlowInstance = useReactFlow<DWTSNodeData, any>();
  const reactFlowService = useReactFlowService(reactFlowInstance);

  // context menu
  const contextMenuRef = useRef<GenericPositionContextMenuHandle>(null);
  const readonly = !props.isConnectable;

  // global server state (react-query)
  const code = CodeHooks.useGetCode(props.data.codeId);
  const bboxAnnotations = BboxAnnotationHooks.useGetByCodeAndUser(props.data.codeId, userId);
  const spanAnnotations = SpanAnnotationHooks.useGetByCodeAndUser(props.data.codeId, userId);
  const parentCode = CodeHooks.useGetCode(code.data?.parent_code_id);
  const memo = CodeHooks.useGetMemo(props.data.codeId, userId);

  // TODO: This is not optimal!
  // we need a new route to get all child codes
  // then we need to invalidate these child codes, on code update
  // also! we need a mechanism in the backend to detect loops in the code tree, and prevent them
  const projectCodes = ProjectHooks.useGetAllCodes(projectId, true);
  const childCodes = useMemo(() => {
    return projectCodes.data?.filter((projectcode) => projectcode.parent_code_id === props.data.codeId) ?? [];
  }, [props.data.codeId, projectCodes.data]);

  // effects
  useEffect(() => {
    if (!parentCode.data) return;
    const parentCodeId = parentCode.data.id;

    // checks which edges are already in the graph and removes edges to non-existing codes
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isCodeParentCodeEdge)
      .filter((edge) => edge.target === `code-${props.data.codeId}`)
      .filter((edge) => edge.source !== `code-${parentCodeId}`);
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which code nodes are already in the graph and adds edges to the correct node
    const existingCodeNodeIds = reactFlowInstance
      .getNodes()
      .filter(isCodeNode)
      .map((code) => code.data.codeId);

    if (existingCodeNodeIds.includes(parentCodeId)) {
      reactFlowInstance.addEdges([createCodeParentCodeEdge({ codeId: props.data.codeId, parentCodeId })]);
    }
  }, [props.data.codeId, reactFlowInstance, parentCode.data]);

  useEffect(() => {
    const codeId = props.data.codeId;
    const childCodeIds = childCodes.map((code) => code.id);

    // checks which edges are already in the graph and removes edges to non-existing codes
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isCodeParentCodeEdge)
      .filter((edge) => edge.source === `code-${codeId}`)
      .filter((edge) => !childCodeIds.includes(parseInt(edge.target.split("-")[1])));
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which child code nodes are already in the graph and adds edges to the correct node
    const existingChildCodeNodes = reactFlowInstance
      .getNodes()
      .filter(isCodeNode)
      .filter((code) => childCodeIds.includes(code.data.codeId));
    reactFlowInstance.addEdges(
      existingChildCodeNodes.map((childCode) =>
        createCodeParentCodeEdge({ codeId: childCode.data.codeId, parentCodeId: codeId }),
      ),
    );
  }, [reactFlowInstance, props.data.codeId, childCodes]);

  useEffect(() => {
    if (!memo.data) return;
    const memoId = memo.data.id;

    // checks which edges are already in the graph and removes edges to non-existing memos
    const edgesToDelete = reactFlowInstance
      .getEdges()
      .filter(isMemoCodeEdge)
      .filter((edge) => edge.target === `code-${props.data.codeId}`) // isEdgeForThisCode
      .filter((edge) => parseInt(edge.source.split("-")[1]) !== memoId); // isEdgeForIncorrectMemo
    reactFlowInstance.deleteElements({ edges: edgesToDelete });

    // checks which memo nodes are already in the graph and adds edge to the correct node
    const existingMemoNodeIds = reactFlowInstance
      .getNodes()
      .filter(isMemoNode)
      .map((memo) => memo.data.memoId);
    if (existingMemoNodeIds.includes(memoId)) {
      reactFlowInstance.addEdges([createMemoCodeEdge({ memoId, codeId: props.data.codeId })]);
    }
  }, [props.data.codeId, reactFlowInstance, memo.data]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.detail >= 2 && code.isSuccess) {
      openCodeEditDialog(code.data);
    }
  };

  // context menu actions
  const handleContextMenuExpandImageAnnotations = () => {
    if (!bboxAnnotations.data || bboxAnnotations.data.length === 0) return;

    reactFlowService.addNodes(
      createBBoxAnnotationNodes({
        bboxAnnotations: bboxAnnotations.data,
        position: { x: props.xPos, y: props.yPos - 200 },
      }),
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandTextAnnotations = () => {
    if (!spanAnnotations.data || spanAnnotations.data.length === 0) return;

    reactFlowService.addNodes(
      createSpanAnnotationNodes({
        spanAnnotations: spanAnnotations.data,
        position: { x: props.xPos, y: props.yPos - 200 },
      }),
    );
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandChildCodes = () => {
    if (childCodes.length === 0) return;

    reactFlowService.addNodes(createCodeNodes({ codes: childCodes, position: { x: props.xPos, y: props.yPos - 200 } }));
    contextMenuRef.current?.close();
  };

  const handleContextMenuCreateChildCode = () => {
    openCodeCreateDialog({
      parentCodeId: props.data.codeId,
      onSuccess: (code) => {
        reactFlowService.addNodes(createCodeNodes({ codes: [code], position: { x: props.xPos, y: props.yPos - 200 } }));
      },
    });
    contextMenuRef.current?.close();
  };

  const handleContextMenuExpandParentCode = () => {
    if (!parentCode.data) return;

    reactFlowService.addNodes(
      createCodeNodes({ codes: [parentCode.data], position: { x: props.xPos, y: props.yPos - 200 } }),
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

    MemoAPI.openMemo({
      attachedObjectType: AttachedObjectType.CODE,
      attachedObjectId: props.data.codeId,
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
        allowDrawConnection={true}
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
        {code.isSuccess ? (
          <>
            <CardHeader title={<CodeRenderer code={code.data} />} />
            <CardContent>
              <Typography>{code.data.description}</Typography>
            </CardContent>
          </>
        ) : code.isError ? (
          <>{code.error.message}</>
        ) : (
          <>Loading...</>
        )}
      </BaseCardNode>
      <GenericPositionMenu ref={contextMenuRef}>
        <MenuItem onClick={handleContextMenuExpandTextAnnotations}>
          Expand text annotations ({spanAnnotations.data?.length || 0})
        </MenuItem>
        <MenuItem onClick={handleContextMenuExpandImageAnnotations}>
          Expand image annotations ({bboxAnnotations.data?.length || 0})
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleContextMenuExpandParentCode} disabled={!parentCode.data}>
          Expand parent code
        </MenuItem>
        <MenuItem onClick={handleContextMenuExpandChildCodes}>Expand child codes</MenuItem>
        <MenuItem onClick={handleContextMenuCreateChildCode} disabled={code.data?.user_id === SYSTEM_USER_ID}>
          Create child code
        </MenuItem>
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

export default CodeNode;
