import { CircularProgress, Portal, Typography } from "@mui/material";
import { useContext } from "react";
import { useParams } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import WhiteboardHooks from "../../api/WhiteboardHooks";
import { useAuth } from "../../auth/AuthProvider";
import EditableTypography from "../../components/NavBarTop/EditableTypography";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import WhiteboardFlow from "./WhiteboardFlow";

function Whiteboard() {
  // global client state
  const { user } = useAuth();
  const appBarContainerRef = useContext(AppBarContext);
  const urlParams = useParams() as { projectId: string; whiteboardId: string };
  const projectId = parseInt(urlParams.projectId);
  const whiteboardId = parseInt(urlParams.whiteboardId);

  // global server state
  const updateWhiteboardMutation = WhiteboardHooks.useUpdateWhiteboard();
  const whiteboard = WhiteboardHooks.useGetWhiteboard(whiteboardId);

  const readonly = whiteboard.data?.user_id !== user.data?.id;

  const handleChange = (value: string) => {
    if (!whiteboard.data || whiteboard.data.title === value) return;

    updateWhiteboardMutation.mutate({
      whiteboardId: whiteboard.data.id,
      requestBody: {
        title: value,
        content: JSON.stringify(whiteboard.data.content),
      },
    });
  };

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        {readonly ? (
          <Typography variant="h6">{whiteboard.data?.title} - READONLY</Typography>
        ) : (
          <EditableTypography value={whiteboard.data?.title || "Loading"} onChange={handleChange} variant="h6" />
        )}
      </Portal>
      {whiteboard.isSuccess ? (
        <ReactFlowProvider>
          <WhiteboardFlow key={`${projectId}-${whiteboardId}`} whiteboard={whiteboard.data} readonly={readonly} />
        </ReactFlowProvider>
      ) : whiteboard.isLoading ? (
        <CircularProgress />
      ) : whiteboard.isError ? (
        <div>ERROR: {whiteboard.error.message}</div>
      ) : null}
    </>
  );
}

export default Whiteboard;
