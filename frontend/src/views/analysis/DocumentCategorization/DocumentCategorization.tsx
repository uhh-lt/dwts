import {
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import AnalysisHooks from "../../../api/AnalysisHooks.ts";
import TopWordsBarChart from "./TopWordsBarChart.tsx";
import TopicDistrChart from "./TopicDistrBarChart.tsx";

function DocumentCategorization() {
  const topic_distr_data = AnalysisHooks.useReturnTopicDistrData();
  const top_words_data = AnalysisHooks.useReturnTopWordsData();

  const [currentTopic, setCurrentTopic] = useState(0);
  const ollamaResponse = AnalysisHooks.useReturnTopWordsOllama(currentTopic);

  // Handle Ollama response changes
  useEffect(() => {
    if (ollamaResponse) {
      console.log("ollamaResponse data updated: ", ollamaResponse.data);
    }
  }, [ollamaResponse]);

  const handleChange = (event: SelectChangeEvent<number>) => {
    setCurrentTopic(event.target.value as number);
  };

  return (
    <div>
      <Card>
        <CardContent>
          <Typography gutterBottom sx={{ color: "text.secondary", fontSize: 14 }}>
            Document Categorization using LLM's and Topic Modeling
          </Typography>
        </CardContent>
        <FormControl fullWidth>
          <InputLabel id="dynamic-dropdown-label">Select Key</InputLabel>
          <Select labelId="dynamic-dropdown-label" value={currentTopic} onChange={handleChange}>
            {top_words_data.isLoading && <div>Loading...</div>}
            {top_words_data.isSuccess ? (
              Object.keys(top_words_data.data).map((key) => (
                <MenuItem key={key} value={key}>
                  {key}
                </MenuItem>
              ))
            ) : (
              <div></div>
            )}
          </Select>
        </FormControl>

        <Grid container spacing={2}>
          <Grid item xs={6} style={{ textAlign: "center" }}>
            TODO: Display ChatGPT Result
          </Grid>
          <Grid item xs={6} style={{ textAlign: "center" }}>
            TODO: Display Ollama Result
          </Grid>
          <Grid item xs={6} style={{ textAlign: "center" }}>
            Top Words Graph
            {top_words_data.isLoading && <div>Loading...</div>}
            {top_words_data.isSuccess ? (
              <TopWordsBarChart
                data={top_words_data.data as Record<string, { word: string; score: number }>[]}
                topicNum={currentTopic}
              ></TopWordsBarChart>
            ) : (
              <div></div>
            )}
          </Grid>
          <Grid item xs={6} style={{ textAlign: "center" }}>
            Topic Distr / Main Docs where Topic is found
            {topic_distr_data.isLoading && <div>Loading...</div>}
            {topic_distr_data.isSuccess ? (
              <TopicDistrChart data={topic_distr_data.data as Record<string, number>[]}></TopicDistrChart>
            ) : (
              <div></div>
            )}
          </Grid>
        </Grid>
      </Card>
    </div>
  );
}
export default DocumentCategorization;
