import { Button, CircularProgress } from "@mui/material";
import { useCallback } from "react";
import MemoHooks from "../../../api/MemoHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import MemoBlockEditorView from "../../../components/Memo/MemoBlockEditorView.tsx";

interface AnnotationCardMemoProps {
  annotationId: number;
  annotationType: AttachedObjectType;
  codeName: string;
  annotationText: string;
}

function AnnotationCardMemo(props: AnnotationCardMemoProps) {
  const memo = MemoHooks.useGetUserMemo(props.annotationType, props.annotationId);
  if (memo.isSuccess) {
    return <AnnotationCardMemoEditor key={memo.data?.id} memo={memo.data} />;
  } else if (memo.isError) {
    return <AnnotationCardMemoCreateButton {...props} />;
  } else if (memo.isLoading) {
    return <CircularProgress size={"30px"} />;
  } else {
    return null;
  }
}

function AnnotationCardMemoCreateButton({
  annotationId,
  annotationType,
  annotationText,
  codeName,
}: AnnotationCardMemoProps) {
  const { mutate: createMemoMutation, isPending } = MemoHooks.useCreateMemo();
  const handleAddMemo = () => {
    createMemoMutation({
      attachedObjectId: annotationId,
      attachedObjectType: annotationType,
      requestBody: {
        content: "",
        content_json: "",
        title: `My memo for ${annotationType} - ${codeName} - ${annotationText.slice(0, 10)}...`,
      },
    });
  };

  return (
    <Button onClick={handleAddMemo} disabled={isPending}>
      Add Memo
    </Button>
  );
}

function AnnotationCardMemoEditor({ memo }: { memo: MemoRead }) {
  // global client state
  const { user } = useAuth();

  const isEditable = user?.id === memo.user_id;

  // actions
  const { mutate: updateMemo } = MemoHooks.useUpdateMemo();
  const handleMemoChange = useCallback(
    (markdown: string, json: string) => {
      updateMemo({
        memoId: memo.id,
        requestBody: {
          content: markdown,
          content_json: json,
        },
      });
    },
    [memo.id, updateMemo],
  );

  return (
    <MemoBlockEditorView
      initialContentJson={memo.content_json}
      onChange={handleMemoChange}
      editable={isEditable}
      style={{ maxHeight: "200px" }}
    />
  );
}

export default AnnotationCardMemo;
