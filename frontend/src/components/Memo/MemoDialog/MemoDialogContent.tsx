import { SubmitHandler } from "react-hook-form";
import MemoHooks from "../../../api/MemoHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationRead } from "../../../api/openapi/models/BBoxAnnotationRead.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import { ProjectRead } from "../../../api/openapi/models/ProjectRead.ts";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead.ts";
import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead.ts";
import { useOpenSnackbar } from "../../SnackbarDialog/useOpenSnackbar.ts";
import { MemoCreateSuccessHandler } from "./MemoDialogAPI.ts";
import { MemoDialogForm, MemoFormValues } from "./MemoDialogForm.tsx";

interface MemoDialogContentProps {
  attachedObject:
    | DocumentTagRead
    | SourceDocumentRead
    | CodeRead
    | SpanAnnotationRead
    | BBoxAnnotationRead
    | ProjectRead;
  attachedObjectType: AttachedObjectType;
  memo: MemoRead | undefined;
  onMemoCreateSuccess?: MemoCreateSuccessHandler;
  closeDialog: () => void;
}

export function MemoDialogContent({
  attachedObject,
  attachedObjectType,
  memo,
  closeDialog,
  onMemoCreateSuccess,
}: MemoDialogContentProps) {
  // mutations
  const createMutation = MemoHooks.useCreateMemo();
  const updateMutation = MemoHooks.useUpdateMemo();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // form handling
  const handleCreateOrUpdateCodeMemo: SubmitHandler<MemoFormValues> = (data) => {
    if (memo) {
      updateMutation.mutate(
        {
          memoId: memo.id,
          requestBody: {
            title: data.title,
            content: data.content,
            content_json: data.content_json,
          },
        },
        {
          onSuccess: () => {
            openSnackbar({
              text: `Updated memo for ${attachedObjectType} ${attachedObject.id}`,
              severity: "success",
            });
            closeDialog();
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          attachedObjectId: attachedObject.id,
          attachedObjectType: attachedObjectType,
          requestBody: {
            title: data.title,
            content: data.content,
            content_json: data.content_json,
          },
        },
        {
          onSuccess: (data) => {
            openSnackbar({
              text: `Created memo for ${attachedObjectType} ${attachedObject.id}`,
              severity: "success",
            });
            if (onMemoCreateSuccess) onMemoCreateSuccess(data);
            closeDialog();
          },
        },
      );
    }
  };

  return (
    <MemoDialogForm
      key={memo?.id}
      memo={memo}
      handleCreateOrUpdateMemo={handleCreateOrUpdateCodeMemo}
      onDeleteClick={closeDialog}
      attachedObject={attachedObject}
      attachedObjectType={attachedObjectType}
    />
  );
}
