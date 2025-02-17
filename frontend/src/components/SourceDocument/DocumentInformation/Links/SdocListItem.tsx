import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import { Link } from "react-router-dom";
import SdocHooks from "../../../../api/SdocHooks.ts";
import { docTypeToIcon } from "../../../../utils/docTypeToIcon.tsx";

interface SdocListItemProps {
  sdocId: number;
}

function SdocListItem({ sdocId }: SdocListItemProps) {
  // query (global server state)
  const sdoc = SdocHooks.useGetDocument(sdocId);

  return (
    <ListItem disablePadding>
      {sdoc.isSuccess ? (
        <ListItemButton component={Link} to={`/project/${sdoc.data.project_id}/annotation/${sdoc.data.id}`}>
          <ListItemIcon>{docTypeToIcon[sdoc.data.doctype]}</ListItemIcon>
          <ListItemText primary={sdoc.data.name ? sdoc.data.name : sdoc.data.filename} />
        </ListItemButton>
      ) : sdoc.isError ? (
        <ListItemText primary={sdoc.error.message} />
      ) : sdoc.isLoading ? (
        <ListItemText primary="Loading..." />
      ) : null}
    </ListItem>
  );
}

export default SdocListItem;
