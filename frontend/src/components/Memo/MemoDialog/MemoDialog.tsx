import { CircularProgress, Dialog } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import eventBus from "../../../EventBus.ts";

import MemoHooks from "../../../api/MemoHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import useGetMemosAttachedObject from "../useGetMemosAttachedObject.ts";
import { MemoEvent } from "./MemoDialogAPI.ts";
import { MemoDialogContent } from "./MemoDialogContent.tsx";

function MemoDialog() {
  // state
  const [open, setOpen] = useState(false);
  const [memoEventData, setMemoEventData] = useState<MemoEvent>();

  // listen to open-memo event and open the dialog
  const openModal = useCallback((event: CustomEventInit<MemoEvent>) => {
    setOpen(true);
    setMemoEventData(event.detail);
  }, []);

  useEffect(() => {
    eventBus.on("open-memo", openModal);
    return () => {
      eventBus.remove("open-memo", openModal);
    };
  }, [openModal]);

  const handleClose = () => {
    setOpen(false);
    setMemoEventData(undefined);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ style: { height: "66%" } }}>
      {memoEventData?.memoId ? (
        <MemoDialogByID
          memoId={memoEventData.memoId}
          closeDialog={handleClose}
          onMemoCreateSuccess={memoEventData?.onCreateSuccess}
        />
      ) : memoEventData?.attachedObjectId && memoEventData?.attachedObjectType ? (
        <MemoDialogByAttachedObject
          attachedObjectId={memoEventData.attachedObjectId}
          attachedObjectType={memoEventData.attachedObjectType}
          closeDialog={handleClose}
          onMemoCreateSuccess={memoEventData?.onCreateSuccess}
        />
      ) : null}
    </Dialog>
  );
}

interface SharedProps {
  closeDialog: () => void;
  onMemoCreateSuccess?: (memo: MemoRead) => void;
}

function MemoDialogByID({ memoId, ...props }: { memoId: number } & SharedProps) {
  const memo = MemoHooks.useGetMemo(memoId);
  if (memo.isSuccess) {
    return (
      <MemoDialog2
        memo={memo.data}
        attachedObjectId={memo.data.attached_object_id}
        attachedObjectType={memo.data.attached_object_type}
        {...props}
      />
    );
  } else if (memo.isLoading) {
    return <CircularProgress />;
  } else if (memo.isError) {
    return <div>Error: {memo.error.message}</div>;
  } else {
    return null;
  }
}

function MemoDialogByAttachedObject(
  props: { attachedObjectId: number; attachedObjectType: AttachedObjectType } & SharedProps,
) {
  const memo = MemoHooks.useGetUserMemo(props.attachedObjectType, props.attachedObjectId);
  if (memo.isSuccess) {
    return <MemoDialog2 memo={memo.data} {...props} />;
  } else if (memo.isLoading) {
    return <CircularProgress />;
  } else if (memo.isError) {
    return <MemoDialog2 memo={undefined} {...props} />;
  } else {
    return null;
  }
}

function MemoDialog2({
  memo,
  attachedObjectId,
  attachedObjectType,
  closeDialog,
  onMemoCreateSuccess,
}: {
  memo: MemoRead | undefined;
  attachedObjectId: number;
  attachedObjectType: AttachedObjectType;
} & SharedProps) {
  // query
  // there are three cases (attachedObjectType is always set!):
  // 1. memoId is set, attachedObjectId is set
  // 2. memoId is not set, attachedObjectId is set
  // 3. memoId is set, attachedObjectId is not set
  const attachedObject = useGetMemosAttachedObject(attachedObjectType)(attachedObjectId);

  return (
    <>
      {attachedObject.isSuccess ? (
        <MemoDialogContent
          memo={memo}
          attachedObject={attachedObject.data}
          attachedObjectType={attachedObjectType}
          closeDialog={closeDialog}
          onMemoCreateSuccess={onMemoCreateSuccess}
        />
      ) : attachedObject.isLoading && attachedObject.isFetching ? (
        <>Loading!</>
      ) : attachedObject.isError ? (
        <div>Error: {attachedObject.error.message}</div>
      ) : null}
    </>
  );
}

export default MemoDialog;
