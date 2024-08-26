import { Box, Button, Grid, Portal, Stack, Typography } from "@mui/material";
import { MRT_RowSelectionState, MRT_TableOptions } from "material-react-table";
import { useContext, useState } from "react";
import { useParams } from "react-router-dom";
import EntityHooks from "../../../api/EntityHooks.ts";
import { SpanTextRead } from "../../../api/openapi/models/SpanTextRead.ts";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import EntityTable, { EnitityTableRow, EntityTableSaveRowProps, SpanTextTableRow } from "./EntityTable.tsx";

function EntityDashboard() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux)
  const isSplitView = useAppSelector((state) => state.annotatedSegments.isSplitView);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const entityMerge = EntityHooks.useMerge();
  const entityRelease = EntityHooks.useRelease();
  const entityUpdate = EntityHooks.useUpdateEntity();

  function handleRelease(selectedSpanTexts: SpanTextRead[]): void {
    const requestBody = {
      requestBody: {
        project_id: projectId,
        spantext_ids: selectedSpanTexts.map((spantext) => spantext.id),
      },
    };
    entityRelease.mutate(requestBody);
    setRowSelectionModel({});
  }

  const handleUpdate: MRT_TableOptions<EnitityTableRow | SpanTextTableRow>["onEditingRowSave"] = async ({
    row,
    values,
    table,
  }) => {
    const requestBody = {
      entityId: row.original.id,
      requestBody: {
        name: values.name,
        span_text_ids: row.original.subRows.map((span_text) => span_text.id),
        knowledge_base_id: values.knowledge_base_id,
      },
    };
    entityUpdate.mutate(requestBody);
    table.setEditingRow(null);
  };

  function handleMerge(props: EntityTableSaveRowProps): void {
    props.table.setCreatingRow(null);
    const name = props.values.name;
    const knowledge_base_id = props.values.knowledge_base_id;
    const requestBody = {
      requestBody: {
        name: name,
        project_id: projectId,
        spantext_ids: props.selectedSpanTexts.map((spantext) => spantext.id),
        knowledge_base_id: knowledge_base_id,
      },
    };
    entityMerge.mutate(requestBody);
    setRowSelectionModel({});
  }

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Entity Dashboard
        </Typography>
      </Portal>
      <Grid container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid item md={isSplitView ? 6 : 12} className="myFlexContainer h100">
          <EntityTable
            projectId={projectId}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionChange={setRowSelectionModel}
            renderBottomToolbarCustomActions={(props) => {
              return (
                <Stack direction={"row"} spacing={1} alignItems="center" p={1}>
                  <Box flexGrow={1} />
                  <Button onClick={() => props.table.setCreatingRow(true)}>Merge</Button>
                  <Button onClick={() => handleRelease(props.selectedSpanTexts)}>Release</Button>
                </Stack>
              );
            }}
            onSaveEditRow={handleUpdate}
            onCreateSaveRow={handleMerge}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default EntityDashboard;
