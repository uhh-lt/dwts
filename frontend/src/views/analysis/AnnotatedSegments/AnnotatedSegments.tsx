import ReorderIcon from "@mui/icons-material/Reorder";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Portal,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import React, { useContext, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import AnalysisHooks from "../../../api/AnalysisHooks";
import { AnnotatedSegment, AttachedObjectType, DBColumns } from "../../../api/openapi";
import { useAuth } from "../../../auth/AuthProvider";
import MemoRenderer2 from "../../../components/DataGrid/MemoRenderer2";
import SdocRenderer from "../../../components/DataGrid/SdocRenderer";
import SpanAnnotationRenderer from "../../../components/DataGrid/SpanAnnotationRenderer";
import TagRenderer from "../../../components/DataGrid/TagRenderer";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu";
import SpanAnnotationEditDialog, {
  openSpanAnnotationEditDialog,
} from "../../../features/CrudDialog/SpanAnnotation/SpanAnnotationEditDialog";
import FilterDialog from "../../../features/FilterDialog/FilterDialog";
import { useFilterSliceSelector } from "../../../features/FilterDialog/FilterProvider";
import MemoAPI from "../../../features/Memo/MemoAPI";
import { AppBarContext } from "../../../layouts/TwoBarLayout";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import SpanAnnotationCard from "./SpanAnnotationCard";
import SpanAnnotationCardList from "./SpanAnnotationCardList";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice";

function AnnotatedSegments() {
  const appBarContainerRef = useContext(AppBarContext);

  // local client state
  const contextMenuRef = useRef<GenericPositionContextMenuHandle>(null);
  const filterDialogAnchorRef = useRef<HTMLDivElement>(null);
  const [rowSelectionModel, setRowSelectionModel] = useState<number[]>([]);

  // global client state (react router)
  const { user } = useAuth();
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux)
  const contextSize = useAppSelector((state) => state.annotatedSegments.contextSize);
  const isSplitView = useAppSelector((state) => state.annotatedSegments.isSplitView);
  const filter = useFilterSliceSelector().filter;
  const dispatch = useAppDispatch();

  // global server state (react query)
  const annotatedSegmentsMap = AnalysisHooks.useAnnotatedSegments(projectId, user.data?.id, filter);

  // computed
  const columns: GridColDef<AnnotatedSegment>[] = useMemo(
    () => [
      {
        field: "memo_id",
        headerName: "Memo",
        flex: 3,
        description: "Your comments on the annotation",
        renderCell: (params) =>
          user.data ? (
            <MemoRenderer2
              attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
              attachedObjectId={params.row.span_annotation_id}
              userId={user.data.id}
              showTitle={false}
              showContent
              showIcon={false}
            />
          ) : null,
      },
      {
        field: "sdoc_id",
        headerName: "Document",
        flex: 2,
        renderCell: (params) => <SdocRenderer sdoc={params.row.sdoc_id} link />,
      },
      {
        field: "tag_ids",
        headerName: "Tags",
        flex: 2,
        renderCell: (params) => (
          <Stack direction="row" alignItems="center" overflow="auto">
            {params.row.tag_ids.map((tagId) => (
              <TagRenderer key={tagId} tag={tagId} mr={0.5} />
            ))}
          </Stack>
        ),
      },
      {
        field: "code",
        headerName: "Code",
        flex: 1,
        renderCell: (params) => (
          <SpanAnnotationRenderer spanAnnotation={params.row.span_annotation_id} showSpanText={false} />
        ),
      },
      {
        field: "annotation",
        headerName: "Annotated text",
        flex: 3,
        renderCell: (params) => (
          <SpanAnnotationRenderer spanAnnotation={params.row.span_annotation_id} showCode={false} />
        ),
      },
    ],
    [user.data],
  );

  // actions
  const handleClickSplitView = () => {
    dispatch(AnnotatedSegmentsActions.toggleSplitView());
  };

  const openMemo = (annotatedSegment: AnnotatedSegment) => {
    MemoAPI.openMemo({
      memoId: annotatedSegment.memo_id,
      attachedObjectType: AttachedObjectType.SPAN_ANNOTATION,
      attachedObjectId: annotatedSegment.span_annotation_id,
    });
  };

  const openSpanAnnotation = (segments: AnnotatedSegment[]) => {
    openSpanAnnotationEditDialog(segments.map((segment) => segment.span_annotation_id));
  };

  // events
  const handleChangeCodeClick = () => {
    if (!annotatedSegmentsMap.data) return;

    openSpanAnnotation(rowSelectionModel.map((id) => annotatedSegmentsMap.data[id]));
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!event.currentTarget) {
      return;
    }
    const rowId = Number((event.currentTarget as HTMLDivElement).getAttribute("data-id"));
    setRowSelectionModel([rowId]);
    contextMenuRef.current?.open({ left: event.clientX, top: event.clientY });
  };

  const handleContextMenuOpenMemo = () => {
    if (rowSelectionModel.length !== 1 || !annotatedSegmentsMap.data) return;

    contextMenuRef.current?.close();
    openMemo(annotatedSegmentsMap.data[rowSelectionModel[0]]);
  };

  const handleContextMenuChangeCode = () => {
    if (rowSelectionModel.length !== 1 || !annotatedSegmentsMap.data) return;

    contextMenuRef.current?.close();
    openSpanAnnotation([annotatedSegmentsMap.data[rowSelectionModel[0]]]);
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
                {rowSelectionModel.length > 0 && (
                  <Button onClick={handleChangeCodeClick}>
                    Change code of {rowSelectionModel.length} annotated segments
                  </Button>
                )}
                <FilterDialog anchorEl={filterDialogAnchorRef.current} />
                <Box sx={{ flexGrow: 1 }} />
                <TextField
                  label="Context Size"
                  type="number"
                  size="small"
                  value={contextSize}
                  onChange={(event) => dispatch(AnnotatedSegmentsActions.setContextSize(parseInt(event.target.value)))}
                />
                <Tooltip title={"Export segments"}>
                  <span>
                    <IconButton disabled>
                      <SaveAltIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Split/not split view">
                  <IconButton onClick={handleClickSplitView}>
                    {isSplitView ? <ReorderIcon /> : <VerticalSplitIcon />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </CardContent>
          </Card>

          {!isSplitView && rowSelectionModel.length > 0 && annotatedSegmentsMap.data && (
            <SpanAnnotationCard
              key={annotatedSegmentsMap.data[rowSelectionModel[rowSelectionModel.length - 1]].span_annotation_id}
              annotationId={
                annotatedSegmentsMap.data[rowSelectionModel[rowSelectionModel.length - 1]].span_annotation_id
              }
              sx={{ mb: 2, flexShrink: 0 }}
            />
          )}

          <Card sx={{ width: "100%" }} elevation={2} className="myFlexFillAllContainer myFlexContainer h100">
            <CardHeader title="Annotated Segments" />
            <CardContent className="myFlexFillAllContainer h100" style={{ padding: 0 }}>
              <div className="h100" style={{ width: "100%" }} ref={filterDialogAnchorRef}>
                {annotatedSegmentsMap.isSuccess ? (
                  <DataGrid
                    rows={Object.values(annotatedSegmentsMap.data)}
                    columns={columns}
                    autoPageSize
                    getRowId={(row) => row.span_annotation_id}
                    style={{ border: "none" }}
                    checkboxSelection
                    rowSelectionModel={rowSelectionModel}
                    onRowSelectionModelChange={(selectionModel) => setRowSelectionModel(selectionModel as number[])}
                    slotProps={{
                      row: {
                        onContextMenu: handleContextMenu,
                      },
                    }}
                    disableColumnFilter
                  />
                ) : annotatedSegmentsMap.isLoading ? (
                  <CircularProgress />
                ) : (
                  <Typography variant="body1" color="inherit" component="div">
                    {annotatedSegmentsMap.error?.message}
                  </Typography>
                )}
              </div>
            </CardContent>
          </Card>
        </Grid>
        {isSplitView && <SpanAnnotationCardList spanAnnotationIds={rowSelectionModel} />}
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
