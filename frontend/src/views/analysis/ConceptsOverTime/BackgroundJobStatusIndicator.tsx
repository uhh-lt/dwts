import { Box } from "@mui/material";
import { BackgroundJobStatus } from "../../../api/openapi";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

interface BackgroundJobStatusIndicatorProps {
  status: BackgroundJobStatus | undefined | null;
  infoText: string | undefined | null;
}

const status2Color: Record<BackgroundJobStatus, string> = {
  Aborted: "#9c27b0",
  Errorneous: "#f44336",
  Finished: "#8bc34a",
  Running: "#ffc107",
  Waiting: "#2196f3",
};

const status2Text: Record<BackgroundJobStatus, string> = {
  Aborted: "Aborted",
  Errorneous: "Errorneous",
  Finished: "Finished",
  Running: "Running",
  Waiting: "Waiting",
};

function BackgroundJobStatusIndicator({ status, infoText }: BackgroundJobStatusIndicatorProps) {
  return (
    <Box sx={{ p: 1, display: "flex", alignItems: "center" }}>
      <FiberManualRecordIcon
        fontSize="small"
        sx={{
          mr: 1,
          color: status ? status2Color[status] : "grey.500",
        }}
      />
      Status {status ? status2Text[status] : "No Job"} {infoText && `- ${infoText}`}
    </Box>
  );
}

export default BackgroundJobStatusIndicator;
