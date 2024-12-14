import { Button, Card, CardContent, Typography } from "@mui/material";
import { useState } from "react";
import AnalysisHooks from "../../../api/AnalysisHooks.ts";
import TopWordsBarChart from "./TopWordsBarChart.tsx";
import TopicDistrChart from "./TopicDistrBarChart.tsx";

function DocumentCategorization() {
  const topic_distr_data = AnalysisHooks.useReturnTopicDistrData();
  const top_words_data = AnalysisHooks.useReturnTopWordsData();
  const dto = AnalysisHooks.useReturnTopWordsOllama(0);

  const [isToggled, setIsToggled] = useState(false);

  const handleRun = () => {
    if (topic_distr_data.data) {
      console.log(`handleRun: ${topic_distr_data.data}`);
      setIsToggled((prev) => !prev);
    }

    console.log(`test: ${dto.data}`);
    const data = dto.data as Record<string, unknown>[];
    console.log(data[0]["umbrella_term"]);
  };

  return (
    <div>
      <Card>
        <CardContent>
          <Typography gutterBottom sx={{ color: "text.secondary", fontSize: 14 }}>
            Document Categorization using LLM's and Topic Modeling
          </Typography>
        </CardContent>
        {top_words_data.isLoading && <div>Loading...</div>}
        {topic_distr_data.isLoading && <div>Loading...</div>}
        {dto.isLoading && <div>Ollama Service Loading...</div>}
        {isToggled ? (
          top_words_data.isSuccess ? (
            <TopWordsBarChart
              data={top_words_data.data as Record<string, { word: string; score: number }>[]}
            ></TopWordsBarChart>
          ) : (
            <div></div>
          )
        ) : topic_distr_data.isSuccess ? (
          <TopicDistrChart data={topic_distr_data.data as Record<string, number>[]}></TopicDistrChart>
        ) : (
          <div></div>
        )}
      </Card>
      <Button variant="outlined" onClick={handleRun}>
        Run
      </Button>
    </div>
  );
}
export default DocumentCategorization;
