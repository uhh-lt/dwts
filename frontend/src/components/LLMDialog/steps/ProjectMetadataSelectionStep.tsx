import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton } from "@mui/lab";
import { Box, Button, DialogActions, DialogContent, Typography } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useMemo, useState } from "react";
import LLMHooks from "../../../api/LLMHooks.ts";
import MetadataHooks from "../../../api/MetadataHooks.ts";
import { DocType } from "../../../api/openapi/models/DocType.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { TaskType } from "../../../api/openapi/models/TaskType.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import ProjectMetadataTable from "../../Metadata/ProjectMetadataTable.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import LLMUtterance from "./LLMUtterance.tsx";

function ProjectMetadataSelectionStep() {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global state
  const projectId = useAppSelector((state) => state.dialog.llmProjectId);
  const selectedDocuments = useAppSelector((state) => state.dialog.llmDocumentIds);
  const dispatch = useAppDispatch();

  // global server state
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();
  const filteredProjectMetadata = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((metadata) => metadata.doctype === DocType.TEXT && metadata.read_only === false);
  }, [projectMetadata.data]);

  // initiate next step (get the generated prompts)
  const determineApproachMutation = LLMHooks.useDetermineApproach();
  const handleNext = (projectMetadata: ProjectMetadataRead[]) => () => {
    determineApproachMutation.mutate(
      {
        requestBody: {
          llm_job_type: TaskType.METADATA_EXTRACTION,
          project_id: projectId,
          specific_task_parameters: {
            llm_job_type: TaskType.METADATA_EXTRACTION,
            project_metadata_ids: projectMetadata.map((metadata) => metadata.id),
            sdoc_ids: selectedDocuments,
          },
        },
      },
      {
        onSuccess(data) {
          dispatch(
            CRUDDialogActions.llmDialogGoToApproachSelection({
              approach: data,
              tags: [],
              metadata: projectMetadata,
              codes: [],
            }),
          );
        },
      },
    );
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            You selected {selectedDocuments.length} document(s) for automatic metadata extraction. Please select all
            metadata that I should try to extract from the documents.
          </Typography>
        </LLMUtterance>
      </DialogContent>
      <ProjectMetadataTable
        projectMetadata={filteredProjectMetadata}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
        renderBottomToolbarCustomActions={(props) => (
          <DialogActions sx={{ width: "100%", p: 0 }}>
            <Box flexGrow={1} />
            <Button
              disabled={determineApproachMutation.isPending}
              onClick={() => dispatch(CRUDDialogActions.previousLLMDialogStep())}
            >
              Back
            </Button>
            <LoadingButton
              variant="contained"
              startIcon={<PlayCircleIcon />}
              loading={determineApproachMutation.isPending}
              loadingPosition="start"
              disabled={props.selectedProjectMetadata.length === 0}
              onClick={handleNext(props.selectedProjectMetadata)}
            >
              Next!
            </LoadingButton>
          </DialogActions>
        )}
      />
    </>
  );
}

export default ProjectMetadataSelectionStep;
