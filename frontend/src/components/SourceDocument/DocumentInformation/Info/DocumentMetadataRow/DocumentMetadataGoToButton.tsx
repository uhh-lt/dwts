import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { IconButtonProps } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

interface DocumentMetadataGoToButtonProps {
  link: string;
}

function DocumentMetadataGoToButton({ link, ...props }: DocumentMetadataGoToButtonProps & IconButtonProps<"a">) {
  return (
    <Tooltip title="Open link in new tab">
      <span>
        <IconButton {...props} href={link} target={"blank"}>
          <OpenInNewIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default DocumentMetadataGoToButton;
