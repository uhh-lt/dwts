import { StackProps } from "@mui/material";
import MemoHooks from "../../api/MemoHooks.ts";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { MemoRendererSharedProps, MemoRendererWithData } from "./MemoRenderer.tsx";

interface MemoRenderer2Props {
  attachedObjectType: AttachedObjectType;
  attachedObjectId: number;
}

function MemoRenderer2({
  attachedObjectType,
  attachedObjectId,
  showIcon: icon = true,
  showTitle: title = true,
  showContent: content = false,
  ...props
}: MemoRenderer2Props & MemoRendererSharedProps & StackProps) {
  const memo = MemoHooks.useGetUserMemo(attachedObjectType, attachedObjectId);

  if (memo.isSuccess && memo.data !== null && memo.data !== undefined) {
    return <MemoRendererWithData memo={memo.data} showIcon={icon} showTitle={title} showContent={content} {...props} />;
  } else if (memo.isLoading) {
    return <div>Loading...</div>;
  } else if (memo.isError) {
    return <div>{memo.error.message}</div>;
  } else {
    return <i>empty</i>;
  }
}

export default MemoRenderer2;
