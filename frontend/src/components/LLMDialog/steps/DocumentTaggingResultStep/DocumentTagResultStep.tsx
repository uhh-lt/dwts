import LabelIcon from "@mui/icons-material/Label";
import { LoadingButton } from "@mui/lab";
import { Button, CircularProgress, DialogActions, DialogContent, Typography } from "@mui/material";
import { useState } from "react";
import LLMHooks from "../../../../api/LLMHooks.ts";
import { DocumentTaggingLLMJobResult } from "../../../../api/openapi/models/DocumentTaggingLLMJobResult.ts";
import { DocumentTagRead } from "../../../../api/openapi/models/DocumentTagRead.ts";
import TagHooks from "../../../../api/TagHooks.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import LLMUtterance from "../LLMUtterance.tsx";
import { DocumentTaggingResultRow } from "./DocumentTaggingResultRow.ts";
import DocumentTagResultStepTable from "./DocumentTagResultStepTable.tsx";

function DocumentTagResultStep() {
  // global client state
  const llmJobId = useAppSelector((state) => state.dialog.llmJobId);

  // global server state
  const documentTags = TagHooks.useGetAllTags();
  const llmJob = LLMHooks.usePollLLMJob(llmJobId, undefined);

  if (llmJob.isSuccess && llmJob.data.result && documentTags.isSuccess) {
    return (
      <DocumentTagResultStepContent
        jobResult={llmJob.data.result.specific_task_result as DocumentTaggingLLMJobResult}
        tags={documentTags.data}
      />
    );
  } else if (llmJob.isLoading || documentTags.isLoading) {
    return (
      <DialogContent>
        <CircularProgress />
      </DialogContent>
    );
  } else if (llmJob.isError) {
    return <DialogContent>{llmJob.error.message}</DialogContent>;
  } else if (documentTags.isError) {
    return <DialogContent>{documentTags.error.message}</DialogContent>;
  } else {
    return <></>;
  }
}

function DocumentTagResultStepContent({
  jobResult,
  tags,
}: {
  jobResult: DocumentTaggingLLMJobResult;
  tags: DocumentTagRead[];
}) {
  // local client state
  const [rows, setRows] = useState<DocumentTaggingResultRow[]>(() => {
    const tagId2Tag = tags.reduce(
      (acc, tag) => {
        acc[tag.id] = tag;
        return acc;
      },
      {} as Record<number, DocumentTagRead>,
    );

    return jobResult.results.map((result) => {
      return {
        sdocId: result.sdoc_id,
        current_tags: result.current_tag_ids.map((tagId) => tagId2Tag[tagId]),
        suggested_tags: result.suggested_tag_ids.map((tagId) => tagId2Tag[tagId]),
        merged_tags: [...new Set([...result.current_tag_ids, ...result.suggested_tag_ids])].map(
          (tagId) => tagId2Tag[tagId],
        ),
        reasoning: result.reasoning,
      };
    });
  });

  const dispatch = useAppDispatch();

  // actions
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeLLMDialog());
  };

  const applyTagsMutation = TagHooks.useBulkSetDocumentTags();
  const handleApplyNewTags = () => {
    applyTagsMutation.mutate(
      {
        requestBody: rows.map((row) => ({
          source_document_id: row.sdocId,
          document_tag_ids: row.merged_tags.map((tag) => tag.id),
        })),
      },
      {
        onSuccess() {
          dispatch(CRUDDialogActions.closeLLMDialog());
        },
      },
    );
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            Here are the results! You can find my suggestions in the column <i>Suggested Tags</i>. Now, you decide what
            to do with them:
          </Typography>
          <ul style={{ margin: 0 }}>
            <li>Use your current tags (discarding my suggestions)</li>
            <li>Use my suggested tags (discarding the current tags)</li>
            <li>Merge both your current tags and my suggested tags</li>
          </ul>
        </LLMUtterance>
      </DialogContent>
      <DocumentTagResultStepTable rows={rows} onUpdateRows={setRows} />
      <DialogActions>
        <Button onClick={handleClose}>Discard results & close</Button>
        <LoadingButton
          variant="contained"
          startIcon={<LabelIcon />}
          onClick={handleApplyNewTags}
          loading={applyTagsMutation.isPending}
          loadingPosition="start"
        >
          Apply new tags
        </LoadingButton>
      </DialogActions>
    </>
  );
}

export default DocumentTagResultStep;
