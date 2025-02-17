import PlayCircleFilledWhiteIcon from "@mui/icons-material/PlayCircleFilledWhite";
import { Box, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import SdocHooks from "../../../api/SdocHooks.ts";

interface SdocAudioLinkProps {
  projectId: number;
  filename: string;
  toPrefix: string;
}

function SdocAudioLink({ projectId, filename, toPrefix }: SdocAudioLinkProps) {
  const sdocId = SdocHooks.useGetDocumentIdByFilename(filename, projectId);
  const thumbnailUrl = SdocHooks.useGetThumbnailURL(sdocId.data);

  return (
    <>
      {sdocId.isSuccess && thumbnailUrl.isSuccess ? (
        <div>
          <Link component={RouterLink} to={`${toPrefix}${sdocId.data}`}>
            <Box sx={{ position: "relative", height: 200, textAlign: "center" }}>
              <PlayCircleFilledWhiteIcon
                sx={{
                  fontSize: 75,
                  top: "calc(50% - 37.5px)",
                  left: "calc(50% - 37.5px)",
                  position: "absolute",
                  color: "rgba(0, 0, 0, 0.666)",
                }}
              />
              <img style={{ marginBottom: 1.5 }} height="200" src={thumbnailUrl.data} alt="Tofu meatballs" />
            </Box>
          </Link>
        </div>
      ) : thumbnailUrl.isError ? (
        <div>Error: {thumbnailUrl.error.message}</div>
      ) : (
        <div>Loading audio...</div>
      )}
    </>
  );
}

export default SdocAudioLink;
