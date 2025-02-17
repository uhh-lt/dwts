// eslint-disable-next-line import/no-unresolved
import "@blocknote/core/fonts/inter.css";
// eslint-disable-next-line import/no-unresolved
import "@blocknote/mantine/style.css";
import { Card, CardHeader, CircularProgress } from "@mui/material";
import { useCallback } from "react";
import MemoHooks from "../../api/MemoHooks.ts";
import MemoBlockEditorView from "../../components/Memo/MemoBlockEditorView.tsx";

interface LogbookEditorProps {
  projectId: number;
}

function LogbookEditor({ projectId }: LogbookEditorProps) {
  // global client state
  const projectMemo = MemoHooks.useGetOrCreateProjectUserMemo(projectId);

  // update memo
  const { mutate: updateMemo } = MemoHooks.useUpdateMemo();
  const handleMemoChange = useCallback(
    (markdown: string, json: string) => {
      if (!projectMemo.data) return;
      updateMemo({
        memoId: projectMemo.data.id,
        requestBody: {
          content: markdown,
          content_json: json,
        },
      });
    },
    [projectMemo.data, updateMemo],
  );

  return (
    <Card className="h100 myFlexContainer">
      <CardHeader title="Project Logbook" />
      {projectMemo.isLoading || projectMemo.isRefetching ? (
        <CircularProgress />
      ) : projectMemo.isError ? (
        <div>Error: {projectMemo.error.message}</div>
      ) : projectMemo.isSuccess ? (
        <MemoBlockEditorView
          initialContentJson={projectMemo.data.content_json}
          onChange={handleMemoChange}
          editable={true}
        />
      ) : null}
    </Card>
  );
}

export default LogbookEditor;
