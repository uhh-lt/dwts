import SaveIcon from "@mui/icons-material/Save";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import { LoadingButton } from "@mui/lab";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { toPng } from "html-to-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker, useParams } from "react-router-dom";
import ReactFlow, {
  Background,
  Connection,
  ConnectionMode,
  ControlButton,
  Controls,
  DefaultEdgeOptions,
  Edge,
  IsValidConnection,
  MarkerType,
  MiniMap,
  Node,
  NodeMouseHandler,
  NodeTypes,
  OnConnect,
  OnSelectionChangeFunc,
  Panel,
  ReactFlowState,
  XYPosition,
  addEdge,
  updateEdge,
  useReactFlow,
  useStore,
} from "reactflow";
import "reactflow/dist/style.css";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks.ts";
import CodeHooks from "../../api/CodeHooks.ts";
import SentenceAnnotationHooks from "../../api/SentenceAnnotationHooks.ts";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks.ts";
import TagHooks from "../../api/TagHooks.ts";
import WhiteboardHooks, { Whiteboard, WhiteboardGraph } from "../../api/WhiteboardHooks.ts";
import BBoxAnnotationEditDialog from "../../components/BBoxAnnotation/BBoxAnnotationEditDialog.tsx";
import CodeEditDialog from "../../components/Code/CodeEditDialog.tsx";
import SentenceAnnotationEditDialog from "../../components/SentenceAnnotation/SentenceAnnotationEditDialog.tsx";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import SpanAnnotationEditDialog from "../../components/SpanAnnotation/SpanAnnotationEditDialog.tsx";
import TagEditDialog from "../../components/Tag/TagEditDialog.tsx";
import { downloadFile } from "../../utils/ExportUtils.ts";
import StraightConnectionLine from "./connectionlines/StraightConnectionLine.tsx";
import CustomEdge from "./edges/CustomEdge.tsx";
import FloatingEdge from "./edges/FloatingEdge.tsx";
import { useReactFlowService } from "./hooks/ReactFlowService.ts";
import { useEdgeStateCustom, useNodeStateCustom } from "./hooks/useNodesEdgesStateCustom.ts";
import BboxAnnotationNode from "./nodes/BboxAnnotationNode.tsx";
import BorderNode from "./nodes/BorderNode.tsx";
import CodeNode from "./nodes/CodeNode.tsx";
import MemoNode from "./nodes/MemoNode.tsx";
import NoteNode from "./nodes/NoteNode.tsx";
import SdocNode from "./nodes/SdocNode.tsx";
import SentenceAnnotationNode from "./nodes/SentenceAnnotationNode.tsx";
import SpanAnnotationNode from "./nodes/SpanAnnotationNode.tsx";
import TagNode from "./nodes/TagNode.tsx";
import TextNode from "./nodes/TextNode.tsx";
import AddBBoxAnnotationNodeDialog from "./toolbar/AddBBoxAnnotationNodeDialog.tsx";
import AddBorderNodeButton from "./toolbar/AddBorderNodeButton.tsx";
import AddCodeNodeDialog from "./toolbar/AddCodeNodeDialog.tsx";
import AddDocumentNodeDialog from "./toolbar/AddDocumentNodeDialog.tsx";
import AddMemoNodeDialog from "./toolbar/AddMemoNodeDialog.tsx";
import AddNoteNodeButton from "./toolbar/AddNoteNodeButton.tsx";
import AddSentenceAnnotationNodeDialog from "./toolbar/AddSentenceAnnotationNodeDialog.tsx";
import AddSpanAnnotationNodeDialog from "./toolbar/AddSpanAnnotationNodeDialog.tsx";
import AddTagNodeDialog from "./toolbar/AddTagNodeDialog.tsx";
import AddTextNodeButton from "./toolbar/AddTextNodeButton.tsx";
import DatabaseEdgeEditMenu, { DatabaseEdgeEditMenuHandle } from "./toolbar/DatabaseEdgeEditMenu.tsx";
import EdgeEditMenu, { EdgeEditMenuHandle } from "./toolbar/EdgeEditMenu.tsx";
import NodeEditMenu, { NodeEditMenuHandle } from "./toolbar/NodeEditMenu.tsx";
import { CustomEdgeData } from "./types/CustomEdgeData.ts";
import { DATSNodeData } from "./types/DATSNodeData.ts";
import { PendingAddNodeAction } from "./types/PendingAddNodeAction.ts";
import {
  isBBoxAnnotationNode,
  isCodeNode,
  isCustomNode,
  isSdocNode,
  isSentenceAnnotationNode,
  isSpanAnnotationNode,
  isTagNode,
} from "./types/typeGuards.ts";
import "./whiteboard.css";
import {
  defaultDatabaseEdgeOptions,
  duplicateCustomNodes,
  isCustomEdge,
  isCustomEdgeArray,
  isDatabaseEdge,
} from "./whiteboardUtils.ts";

const nodeTypes: NodeTypes = {
  border: BorderNode,
  note: NoteNode,
  text: TextNode,
  memo: MemoNode,
  sdoc: SdocNode,
  tag: TagNode,
  code: CodeNode,
  spanAnnotation: SpanAnnotationNode,
  sentenceAnnotation: SentenceAnnotationNode,
  bboxAnnotation: BboxAnnotationNode,
};

const edgeTypes = {
  floating: FloatingEdge,
  custom: CustomEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "custom",
  data: {
    label: {
      text: "",
      variant: "body1",
      color: "#000000",
      bgcolor: "#ffffff",
      bgalpha: 255,
      bold: false,
      italic: false,
      underline: false,
      horizontalAlign: "center",
      verticalAlign: "center",
    },
    type: "simplebezier",
  } as CustomEdgeData,
  style: {
    stroke: "#000000",
    strokeWidth: 3,
  },
  markerEnd: {
    color: "#000000",
    type: MarkerType.ArrowClosed,
  },
  markerStart: undefined,
};

const isValidConnection: IsValidConnection = (connection) => {
  // do not allow connection to self
  if (connection.source === connection.target) return false;

  // if source or target handle are database, the other source or target handle has to be database as well
  if (connection.sourceHandle === "database" || connection.targetHandle === "database") {
    return connection.sourceHandle === "database" && connection.targetHandle === "database";
  }
  return true;
};

const resetSelectedElementsSelector = (state: ReactFlowState) => state.resetSelectedElements;
const connectionHandleIdSelector = (state: ReactFlowState) => state.connectionHandleId;

interface WhiteboardFlowProps {
  whiteboard: Whiteboard;
  readonly: boolean;
}

function WhiteboardFlow({ whiteboard, readonly }: WhiteboardFlowProps) {
  // whiteboard (react-flow)
  const reactFlowInstance = useReactFlow<DATSNodeData>();
  const reactFlowService = useReactFlowService(reactFlowInstance);
  const resetSelection = useStore(resetSelectedElementsSelector);
  const connectionHandleId = useStore(connectionHandleIdSelector);

  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global server state (react query)
  const projectCodes = CodeHooks.useGetAllCodesList();
  const projectTags = TagHooks.useGetAllTags();

  // mutations
  const bulkLinkDocumentTagsMutation = TagHooks.useBulkLinkDocumentTags();
  const updateCodeMutation = CodeHooks.useUpdateCode();
  const updateSpanAnnotationMutation = SpanAnnotationHooks.useUpdateSpanAnnotation();
  const updateSentenceAnnotationMutation = SentenceAnnotationHooks.useUpdateSentenceAnnotation();
  const updateBBoxAnnotationMutation = BboxAnnotationHooks.useUpdateBBoxAnnotation();

  // refs
  const flowRef = useRef<HTMLDivElement>(null);
  const nodeEditMenuRef = useRef<NodeEditMenuHandle>(null);
  const edgeEditMenuRef = useRef<EdgeEditMenuHandle>(null);
  const databaseEdgeEditMenuRef = useRef<DatabaseEdgeEditMenuHandle>(null);

  // local state
  const lastSaveTime = useRef<number>(Date.now());
  const [pendingAction, setPendingAction] = useState<PendingAddNodeAction | undefined>(undefined);
  const [nodes, , onNodesChange] = useNodeStateCustom<DATSNodeData>(whiteboard.content.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgeStateCustom(whiteboard.content.edges);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);

  // snackbar
  const openSnackbar = useOpenSnackbar();

  const handleChangePendingAction = useCallback(
    (action: PendingAddNodeAction | undefined) => {
      resetSelection();
      setPendingAction(() => action);
    },
    [resetSelection],
  );

  const handleExecutePendingAction = (event: React.MouseEvent<Element, MouseEvent>) => {
    if (!pendingAction) return;

    // 64 is toolbar sizse
    const whiteboardPosition: XYPosition = reactFlowInstance.project({ x: event.clientX, y: event.clientY - 64 });
    pendingAction(whiteboardPosition, reactFlowService);
    setPendingAction(undefined);
  };

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setPendingAction(undefined);
      if (!connection.source || !connection.target) return;

      if (connection.sourceHandle === "database" && connection.targetHandle === "database") {
        const sourceNode = reactFlowInstance.getNode(connection.source);
        const targetNode = reactFlowInstance.getNode(connection.target);

        if (!sourceNode || !targetNode) return;

        // tag can be manually connected to document
        if (isSdocNode(targetNode) && isTagNode(sourceNode)) {
          const mutation = bulkLinkDocumentTagsMutation.mutate;
          mutation(
            {
              requestBody: {
                document_tag_ids: [sourceNode.data.tagId],
                source_document_ids: [targetNode.data.sdocId],
              },
            },
            {
              onSuccess() {
                openSnackbar({
                  text: "Tag added to document",
                  severity: "success",
                });
              },
            },
          );
        }

        // code can be manually connected to other code
        if (isCodeNode(sourceNode) && isCodeNode(targetNode)) {
          const mutation = updateCodeMutation.mutate;
          mutation(
            {
              codeId: sourceNode.data.codeId,
              requestBody: {
                parent_id: targetNode.data.codeId,
              },
            },
            {
              onSuccess() {
                openSnackbar({
                  text: "Updated parent code",
                  severity: "success",
                });
              },
            },
          );
        }

        // codes can be manually connected to annotations
        if (isCodeNode(sourceNode) && isSpanAnnotationNode(targetNode)) {
          const mutation = updateSpanAnnotationMutation.mutate;
          mutation({
            spanAnnotationToUpdate: targetNode.data.spanAnnotationId,
            requestBody: {
              code_id: sourceNode.data.codeId,
            },
          });
        }

        // codes can be manually connected to annotations
        if (isCodeNode(sourceNode) && isSentenceAnnotationNode(targetNode)) {
          const mutation = updateSentenceAnnotationMutation.mutate;
          mutation({
            sentenceAnnoToUpdate: targetNode.data.sentenceAnnotationId,
            update: {
              code_id: sourceNode.data.codeId,
            },
          });
        }

        // codes can be manually connected to annotations
        if (isCodeNode(sourceNode) && isBBoxAnnotationNode(targetNode)) {
          const mutation = updateBBoxAnnotationMutation.mutate;
          mutation({
            bboxToUpdate: targetNode.data.bboxAnnotationId,
            requestBody: {
              code_id: sourceNode.data.codeId,
            },
          });
        }
      } else {
        setEdges((e) => addEdge(connection, e));
      }
    },
    [
      reactFlowInstance,
      bulkLinkDocumentTagsMutation.mutate,
      openSnackbar,
      updateCodeMutation.mutate,
      updateSpanAnnotationMutation.mutate,
      updateBBoxAnnotationMutation.mutate,
      updateSentenceAnnotationMutation.mutate,
      setEdges,
    ],
  );

  // gets called after end of edge gets dragged to another source or target
  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => setEdges((els) => updateEdge(oldEdge, newConnection, els)),
    [setEdges],
  );

  const onNodeClick: NodeMouseHandler = () => {
    setPendingAction(undefined);
  };

  const onEdgeClick = () => {
    setPendingAction(undefined);
  };

  const handleSelectionChange: OnSelectionChangeFunc = ({ nodes, edges }) => {
    setSelectedEdges(edges);
    setSelectedNodes(nodes);

    if (edges.length >= 1) {
      // only open database edge edit menu if all edges are database edges
      databaseEdgeEditMenuRef.current?.open(edges.filter((edge) => isDatabaseEdge(edge)));
      edgeEditMenuRef.current?.open(edges.filter((edge) => isCustomEdge(edge)));
    } else {
      edgeEditMenuRef.current?.close();
      databaseEdgeEditMenuRef.current?.close();
    }

    if (nodes.length >= 1) {
      nodeEditMenuRef.current?.open(nodes);
    } else {
      nodeEditMenuRef.current?.close();
    }
  };

  // HIGHLIGHT Feature
  // highlight handles of selected edges
  useEffect(() => {
    const elements = document.getElementsByClassName("selected-handle");
    Array.from(elements).forEach((element: Element) => {
      (element as HTMLElement).classList.remove("selected-handle");
    });

    selectedEdges.forEach((currentEdge) => {
      const sourceHandle = document.querySelector(
        `[data-id='${currentEdge.source}-${currentEdge.sourceHandle}-source']`,
      );
      const targetHandle = document.querySelector(
        `[data-id='${currentEdge.target}-${currentEdge.targetHandle}-source']`,
      );
      sourceHandle?.classList.add("selected-handle");
      targetHandle?.classList.add("selected-handle");
    });
  }, [selectedEdges]);

  // SAVE Feature
  // block navigation if we have changes
  const [oldData, setOldData] = useState(JSON.stringify(whiteboard.content));
  useEffect(() => {
    setOldData(JSON.stringify(whiteboard.content));
  }, [whiteboard.content]);
  useBlocker(() => {
    const newData: WhiteboardGraph = { nodes: nodes, edges: edges };
    if (oldData !== JSON.stringify(newData)) {
      return !window.confirm("You have unsaved changes! Are you sure you want to leave?");
    }
    return false;
  });

  const updateWhiteboard = WhiteboardHooks.useUpdateWhiteboard();
  const handleSaveWhiteboard = useCallback(() => {
    const newData: WhiteboardGraph = { nodes: nodes, edges: edges };
    const mutation = updateWhiteboard.mutate;
    mutation(
      {
        whiteboardId: whiteboard.id,
        requestBody: {
          title: whiteboard.title,
          content: JSON.stringify(newData),
        },
      },
      {
        onSuccess(data) {
          openSnackbar({
            text: `Saved whiteboard '${data.title}'`,
            severity: "success",
          });
        },
      },
    );
  }, [edges, nodes, openSnackbar, updateWhiteboard.mutate, whiteboard.id, whiteboard.title]);

  // autosave whiteboard every 3 minutes
  if (Date.now() - lastSaveTime.current > 1000 * 60 * 3) {
    lastSaveTime.current = Date.now();
    handleSaveWhiteboard();
  }

  return (
    <>
      <Box className="myFlexContainer h100">
        <Box className="myFlexFillAllContainer custom-table">
          <ReactFlow
            ref={flowRef}
            className="whiteboardflow"
            nodes={nodes}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeClick={onNodeClick}
            edges={edges}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onEdgesChange={onEdgesChange}
            onEdgeClick={onEdgeClick}
            onEdgeContextMenu={onEdgeClick}
            onEdgeUpdate={readonly ? undefined : onEdgeUpdate}
            onSelectionChange={handleSelectionChange}
            onConnect={onConnect}
            connectionLineComponent={connectionHandleId === "database" ? StraightConnectionLine : undefined}
            connectionLineStyle={
              connectionHandleId === "database"
                ? defaultDatabaseEdgeOptions.style
                : {
                    strokeWidth: 3,
                    stroke: "black",
                  }
            }
            style={{
              cursor: pendingAction ? "crosshair" : "grab",
            }}
            onPaneClick={handleExecutePendingAction}
            connectionMode={ConnectionMode.Loose}
            isValidConnection={isValidConnection}
            // do not allow edge delete with backspace for database edges
            deleteKeyCode={isCustomEdgeArray(selectedEdges) ? undefined : ""}
            fitView
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
            maxZoom={2}
            elementsSelectable={!readonly}
            nodesDraggable={!readonly}
            nodesConnectable={!readonly} // we misuse this as readonly flag for database nodes
            nodesFocusable={!readonly}
            edgesFocusable={!readonly}
            onKeyDown={(event) => {
              // copy
              if (event.key === "c" && (event.metaKey || event.ctrlKey)) {
                const action: PendingAddNodeAction = (position, reactFlowService) => {
                  reactFlowService.addNodesWithoutDelay(
                    duplicateCustomNodes(position, selectedNodes.filter(isCustomNode)),
                  );
                };
                setPendingAction(() => action);
              }
              // cancel
              if (event.key === "Escape") {
                setPendingAction(undefined);
              }
            }}
          >
            {!readonly && (
              <>
                <Panel position="top-left">
                  <Paper elevation={1} sx={{ mb: 3 }}>
                    <Stack>
                      <Typography p={1}>DATS Objects</Typography>
                      <AddDocumentNodeDialog projectId={projectId} onClick={handleChangePendingAction} />
                      <AddTagNodeDialog projectId={projectId} onClick={handleChangePendingAction} />
                      <AddCodeNodeDialog projectId={projectId} onClick={handleChangePendingAction} />
                      <AddSpanAnnotationNodeDialog projectId={projectId} onClick={handleChangePendingAction} />
                      <AddSentenceAnnotationNodeDialog projectId={projectId} onClick={handleChangePendingAction} />
                      <AddBBoxAnnotationNodeDialog projectId={projectId} onClick={handleChangePendingAction} />
                      <AddMemoNodeDialog projectId={projectId} onClick={handleChangePendingAction} />
                    </Stack>
                  </Paper>
                  <Paper elevation={1}>
                    <Stack>
                      <Typography p={1}>Text Elements</Typography>
                      <AddNoteNodeButton onClick={handleChangePendingAction} />
                      <AddTextNodeButton onClick={handleChangePendingAction} />
                      <AddBorderNodeButton type="Ellipse" onClick={handleChangePendingAction} />
                      <AddBorderNodeButton type="Rectangle" onClick={handleChangePendingAction} />
                      <AddBorderNodeButton type="Rounded" onClick={handleChangePendingAction} />
                    </Stack>
                  </Paper>
                </Panel>
                <Panel position="top-center" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {pendingAction && <Paper sx={{ p: 1 }}>Click anywhere to add node(s)!</Paper>}
                  <NodeEditMenu ref={nodeEditMenuRef} />
                  <EdgeEditMenu ref={edgeEditMenuRef} />
                  <DatabaseEdgeEditMenu ref={databaseEdgeEditMenuRef} />
                </Panel>
                <Panel position="top-right">
                  <Paper elevation={1}>
                    <LoadingButton
                      variant="contained"
                      color="success"
                      startIcon={<SaveIcon />}
                      fullWidth
                      type="submit"
                      loading={updateWhiteboard.isPending}
                      loadingPosition="start"
                      onClick={handleSaveWhiteboard}
                    >
                      Save whiteboard
                    </LoadingButton>
                  </Paper>
                </Panel>
              </>
            )}
            <Background />
            <Controls>
              <ControlButton
                onClick={() => {
                  if (flowRef.current === null) return;
                  reactFlowInstance.fitView({
                    duration: 0,
                    padding: 0.01,
                  });
                  toPng(flowRef.current, {
                    filter: (node) =>
                      !(
                        node?.classList?.contains("react-flow__minimap") ||
                        node?.classList?.contains("react-flow__controls") ||
                        node?.classList?.contains("react-flow__panel")
                      ),
                  }).then((dataUrl) => {
                    downloadFile(dataUrl, `whiteboard-${whiteboard.title}.png`);
                  });
                }}
              >
                <SaveAltIcon
                  style={{
                    maxWidth: "16px",
                    maxHeight: "24px",
                  }}
                />
              </ControlButton>
            </Controls>
            <MiniMap />
          </ReactFlow>
        </Box>
      </Box>
      <SpanAnnotationEditDialog projectId={projectId} />
      <SentenceAnnotationEditDialog projectId={projectId} />
      <BBoxAnnotationEditDialog projectId={projectId} />
      {projectTags.isSuccess && <TagEditDialog tags={projectTags.data} />}
      {projectCodes.isSuccess && <CodeEditDialog codes={projectCodes.data} />}
    </>
  );
}

export default WhiteboardFlow;
