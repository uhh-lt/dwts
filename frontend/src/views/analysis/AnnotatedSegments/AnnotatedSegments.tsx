import ReorderIcon from "@mui/icons-material/Reorder";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import {
  Box,
  Card,
  CardContent,
  Grid,
  IconButton,
  MenuItem,
  Portal,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu.tsx";
import SpanAnnotationEditDialog from "../../../features/CrudDialog/SpanAnnotation/SpanAnnotationEditDialog.tsx";
import { CRUDDialogActions } from "../../../features/CrudDialog/dialogSlice.ts";
import MemoAPI from "../../../features/Memo/MemoAPI.ts";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import AnnotatedSegmentsTable from "./AnnotatedSegmentsTable.tsx";
import SpanAnnotationCard from "./SpanAnnotationCard.tsx";
import SpanAnnotationCardList from "./SpanAnnotationCardList.tsx";
import { AnnotatedSegmentsActions, selectAnnotationIds } from "./annotatedSegmentsSlice.ts";

function AnnotatedSegments() {
  const appBarContainerRef = useContext(AppBarContext);

  // local client state
  const contextMenuRef = useRef<GenericPositionContextMenuHandle>(null);

  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux)
  const contextSize = useAppSelector((state) => state.annotatedSegments.contextSize);
  const isSplitView = useAppSelector((state) => state.annotatedSegments.isSplitView);
  const selectedAnnotationIds = useAppSelector(selectAnnotationIds);
  const dispatch = useAppDispatch();

  // actions
  const handleClickSplitView = () => {
    dispatch(AnnotatedSegmentsActions.toggleSplitView());
  };

  const openMemo = (spanAnnotationId: number) => {
    MemoAPI.openMemo({
      attachedObjectType: AttachedObjectType.SPAN_ANNOTATION,
      attachedObjectId: spanAnnotationId,
    });
  };

  const openSpanAnnotation = (spanAnnotationIds: number[]) => {
    dispatch(CRUDDialogActions.openSpanAnnotationEditDialog({ spanAnnotationIds }));
  };

  // events
  const handleRowContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    contextMenuRef.current?.open({ left: event.clientX, top: event.clientY });
  };

  const handleContextMenuOpenMemo = () => {
    if (selectedAnnotationIds.length !== 1) return;

    contextMenuRef.current?.close();
    openMemo(selectedAnnotationIds[0]);
  };

  const handleContextMenuChangeCode = () => {
    if (selectedAnnotationIds.length !== 1) return;

    contextMenuRef.current?.close();
    openSpanAnnotation([selectedAnnotationIds[0]]);
  };

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Annotated Segments
        </Typography>
      </Portal>
      <Grid container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid item md={isSplitView ? 6 : 12} className="myFlexContainer h100">
          <Card sx={{ mb: 2, flexShrink: 0 }} elevation={2}>
            <CardContent sx={{ p: 1, pb: "8px !important" }}>
              <Stack direction="row" alignItems="center">
                <Box sx={{ flexGrow: 1 }} />
                <TextField
                  label="Context Size"
                  type="number"
                  size="small"
                  value={contextSize}
                  onChange={(event) => dispatch(AnnotatedSegmentsActions.setContextSize(parseInt(event.target.value)))}
                />
                <Tooltip title="Split/not split view">
                  <IconButton onClick={handleClickSplitView}>
                    {isSplitView ? <ReorderIcon /> : <VerticalSplitIcon />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </CardContent>
          </Card>

          {!isSplitView && (
            <SpanAnnotationCard
              key={
                selectedAnnotationIds.length > 0 ? selectedAnnotationIds[selectedAnnotationIds.length - 1] : undefined
              }
              annotationId={
                selectedAnnotationIds.length > 0 ? selectedAnnotationIds[selectedAnnotationIds.length - 1] : undefined
              }
              sx={{ mb: 2, flexShrink: 0 }}
            />
          )}

          <AnnotatedSegmentsTable
            cardProps={{ elevation: 2, className: "myFlexFillAllContainer myFlexContainer" }}
            onRowContextMenu={handleRowContextMenu}
          />
        </Grid>
        {isSplitView && <SpanAnnotationCardList spanAnnotationIds={selectedAnnotationIds} />}
      </Grid>
      <SpanAnnotationEditDialog projectId={projectId} />
      <GenericPositionMenu ref={contextMenuRef}>
        <MenuItem onClick={handleContextMenuChangeCode}>Change code</MenuItem>
        <MenuItem onClick={handleContextMenuOpenMemo}>Edit memo</MenuItem>
      </GenericPositionMenu>
    </Box>
  );
}

export default AnnotatedSegments;
