import {
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import * as React from "react";
//import { useParams } from "react-router-dom";
import AnalysisHooks from "../../../api/AnalysisHooks.ts";
import SdocHooks from "../../../api/SdocHooks.ts";
import TopWordsBarChart from "./TopWordsBarChart.tsx";

function TestAnalysisFeature() {
  const [document, setDocument] = React.useState("1");
  //const projectId = parseInt((useParams() as { projectId: string }).projectId);
  //console.log(projectId);
  const sdoc1 = SdocHooks.useGetDocument(1);
  const sdocList = [sdoc1];
  const list_of_json_strings = AnalysisHooks.useTestAnalysisFeature();
  const top_words_data = AnalysisHooks.useReturnTopWordsData();
  const handleChange = (event: SelectChangeEvent) => {
    setDocument(event.target.value as string);
  };

  const handleRun = () => {
    if (list_of_json_strings.data) {
      console.log(`handleRun: ${list_of_json_strings.data}`);
    }
  };
  //{list_of_json_strings.isLoading && <div>Loading...</div>}
  //{list_of_json_strings.isSuccess && (
  //  <TestD3Object data={list_of_json_strings.data as { x: number; y: number }[]}></TestD3Object>
  //)}
  return (
    <div>
      <Card>
        <CardContent>
          <Typography gutterBottom sx={{ color: "text.secondary", fontSize: 14 }}>
            Document Categorization using LLM's
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="select-document">Document</InputLabel>
            <Select
              labelId="select-document-label"
              id="select-document-id"
              value={document}
              label="Document"
              onChange={handleChange}
            >
              <MenuItem value={sdoc1.data?.id}>1</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
        {sdoc1.isLoading && <div>Loading...</div>}
        {sdoc1.isSuccess && <div>{JSON.stringify(sdocList[Number(document) - 1].data?.content)}</div>}

        {top_words_data.isLoading && <div>Loading...</div>}
        {top_words_data.isSuccess && (
          <TopWordsBarChart
            data={top_words_data.data as Record<string, { word: string; score: number }>[]}
          ></TopWordsBarChart>
        )}
      </Card>
      <Button variant="outlined" onClick={handleRun}>
        Run
      </Button>
    </div>
  );
}
export default TestAnalysisFeature;
