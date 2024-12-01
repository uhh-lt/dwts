import { Button, Card, CardContent, Typography } from "@mui/material";
import AnalysisHooks from "../../../api/AnalysisHooks.ts";
import TopWordsBarChart from "./TopWordsBarChart.tsx";

function DocumentCategorization() {
  const list_of_json_strings = AnalysisHooks.useTestAnalysisFeature();
  const top_words_data = AnalysisHooks.useReturnTopWordsData();

  const handleRun = () => {
    if (list_of_json_strings.data) {
      console.log(`handleRun: ${list_of_json_strings.data}`);
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
