import SquareIcon from "@mui/icons-material/Square";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Portal,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useContext, useState } from "react";
import { useParams } from "react-router-dom";
import AnnoscalingHooks from "../../../api/AnnoscalingHooks.ts";
import CodeHooks from "../../../api/CodeHooks.ts";
import { AnnoscalingResult } from "../../../api/openapi/models/AnnoscalingResult.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import AnnotationScalingList from "./AnnotationScalingList.tsx";

function AnnotationScaling() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);
  const codes = CodeHooks.useGetEnabledCodes();

  const [code, setCode] = useState<CodeRead | null>(null);
  const [opposingCode, setopposingCode] = useState<CodeRead | null>(null);
  const [accept, setAccept] = useState<AnnoscalingResult[]>([]);
  const [reject, setReject] = useState<AnnoscalingResult[]>([]);

  // global server state (react-query)
  const suggestions = AnnoscalingHooks.useAnnotationSuggestions(projectId, code?.id, opposingCode?.id);
  const confirmHook = AnnoscalingHooks.useConfirmSuggestions();

  const handleSubmit = () => {
    confirmHook.mutate(
      {
        requestBody: {
          code_id: code!.id,
          reject_code_id: opposingCode!.id,
          project_id: projectId,
          accept: accept.map((r) => ({ sdoc_id: r.sdoc_id, sentence: r.sentence_id })),
          reject: reject.map((r) => ({ sdoc_id: r.sdoc_id, sentence: r.sentence_id })),
        },
      },
      {
        onSuccess() {
          setAccept([]);
          setReject([]);
        },
      },
    );
  };

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" component="div">
          Annotation Scaling
        </Typography>
      </Portal>
      <Card elevation={1} sx={{ margin: 1 }}>
        <CardActions>
          <Autocomplete
            disablePortal
            options={codes.data ?? []}
            getOptionLabel={(option) => option.name}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box style={{ width: 20, height: 20, backgroundColor: option.color, marginRight: 8 }}></Box>{" "}
                {option.name}
              </li>
            )}
            sx={{ width: 300 }}
            renderInput={(params) => (
              <Stack direction="row" alignItems="center">
                <SquareIcon style={{ color: code?.color ?? "white" }}></SquareIcon>
                <TextField autoFocus {...params} label="Code"></TextField>
              </Stack>
            )}
            autoHighlight
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            onChange={(_event, value) => setCode(value)}
          />
          <Autocomplete
            disablePortal
            options={codes.data ?? []}
            getOptionLabel={(option) => option.name}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box style={{ width: 20, height: 20, backgroundColor: option.color, marginRight: 8 }}></Box>{" "}
                {option.name}
              </li>
            )}
            sx={{ width: 300 }}
            renderInput={(params) => (
              <Stack direction="row" alignItems="center">
                <SquareIcon style={{ color: opposingCode?.color ?? "white" }}></SquareIcon>
                <TextField autoFocus {...params} label="Opposing-Code"></TextField>
              </Stack>
            )}
            autoHighlight
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            onChange={(_event, value) => setopposingCode(value)}
          />
          <Button
            variant="contained"
            disabled={accept.length === 0 && reject.length === 0}
            onClick={() => handleSubmit()}
          >
            Confirm suggestions/rejections
          </Button>
        </CardActions>
        <CardContent style={{ maxHeight: "80vh", overflow: "auto" }}>
          {suggestions.isFetching ? (
            <CircularProgress />
          ) : suggestions.isSuccess ? (
            suggestions.data.length > 0 ? (
              <AnnotationScalingList
                data={suggestions.data!}
                submit={handleSubmit}
                accept={accept}
                reject={reject}
                setAccept={setAccept}
                setReject={setReject}
              />
            ) : (
              <Typography>
                It seems you have not annotated a single positive example (or all possible suggestions are exhausted)
              </Typography>
            )
          ) : (
            <Typography>Select a code and its negated counterpart to retrieve suggestions</Typography>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default AnnotationScaling;
