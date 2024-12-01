import { Button, Card, CardContent, Typography } from "@mui/material";
import AnalysisHooks from "../../../api/AnalysisHooks.ts";
import TopWordsBarChart from "./TopWordsBarChart.tsx";

function DocumentCategorization() {
  const topic_distr_data = AnalysisHooks.useReturnTopicDistrData();
  const top_words_data = AnalysisHooks.useReturnTopWordsData();

  const handleRun = () => {
    if (topic_distr_data.data) {
      console.log(`handleRun: ${topic_distr_data.data}`);
    }
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
export default DocumentCategorization;
