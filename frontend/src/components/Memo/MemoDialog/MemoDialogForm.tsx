import SaveIcon from "@mui/icons-material/Save";
import { Box, Divider, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { SubmitHandler } from "react-hook-form";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationRead } from "../../../api/openapi/models/BBoxAnnotationRead.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import { ProjectRead } from "../../../api/openapi/models/ProjectRead.ts";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead.ts";
import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import { dateToLocaleString } from "../../../utils/DateUtils.ts";
import EditableTypography from "../../EditableTypography.tsx";
import UserName from "../../User/UserName.tsx";
import AttachedObjectRenderer from "../AttachedObjectRenderer.tsx";
import MemoActionsMenu from "../MemoActionsMenu.tsx";
import MemoBlockEditorView from "../MemoBlockEditorView.tsx";

export interface MemoFormValues {
  title: string;
  content: string;
  content_json: string;
}

interface MemoDialogFormProps {
  attachedObject:
    | DocumentTagRead
    | SourceDocumentRead
    | CodeRead
    | SpanAnnotationRead
    | BBoxAnnotationRead
    | ProjectRead;
  attachedObjectType: AttachedObjectType;
  memo: MemoRead | undefined;
  handleCreateOrUpdateMemo: SubmitHandler<MemoFormValues>;
  onDeleteClick: () => void;
}

export function MemoDialogForm({
  memo,
  attachedObject,
  attachedObjectType,
  handleCreateOrUpdateMemo,
  onDeleteClick,
}: MemoDialogFormProps) {
  // global client state
  const { user } = useAuth();

  // local state
  const [formData, setFormData] = useState<MemoFormValues>({
    title: memo?.title || `My new ${attachedObjectType} memo`,
    content: memo?.content || "",
    content_json: memo?.content_json || "",
  });
  const isEditable = !memo || user?.id === memo?.user_id;
  const initialContentJson = useMemo(() => memo?.content_json || "", [memo?.content_json]);

  // actions
  const handleTitleChange = useCallback((title: string) => {
    setFormData((oldFormData) => {
      return { ...oldFormData, title };
    });
  }, []);
  const handleContentChange = useCallback((content: string, contentJson: string) => {
    setFormData((oldFormData) => {
      return { ...oldFormData, content: content, content_json: contentJson };
    });
  }, []);
  const handleSave = () => {
    handleCreateOrUpdateMemo(formData);
  };

  if (!user) return null;
  return (
    <Box className="h100 myFlexContainer">
      <Stack direction="row" alignItems="center" justifyContent="space-between" p={1}>
        <Typography>
          <AttachedObjectRenderer attachedObject={attachedObject} attachedObjectType={attachedObjectType} link />
        </Typography>
        <Typography variant="subtitle2" color="textDisabled" fontSize={12} flexShrink={0}>
          <UserName userId={memo?.user_id || user.id} />
        </Typography>
      </Stack>

      <Divider />
      <Toolbar disableGutters variant="dense" sx={{ justifyContent: "space-between" }}>
        <IconButton onClick={handleSave} color="success">
          <SaveIcon />
        </IconButton>
        {isEditable ? (
          <EditableTypography variant="h6" value={formData.title} onChange={handleTitleChange} whiteColor={false} />
        ) : (
          <Typography variant="h6">{formData.title}</Typography>
        )}
        <MemoActionsMenu memo={memo} onDeleteClick={onDeleteClick} />
      </Toolbar>
      <Divider />
      <MemoBlockEditorView
        initialContentJson={initialContentJson}
        onChange={handleContentChange}
        editable={isEditable}
        debounce={500}
      />
      {memo && (
        <Typography variant="subtitle2" color="textSecondary" fontSize={12} p={1}>
          {"Last modified: " +
            dateToLocaleString(memo.updated).substring(0, dateToLocaleString(memo.updated).indexOf(","))}
        </Typography>
      )}
    </Box>
  );
}
