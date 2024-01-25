import { forwardRef } from "react";
import { COTARead } from "../../../api/openapi";
import { MenuItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import ClearIcon from "@mui/icons-material/Clear";
import GenericPositionMenu, { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu";
import DeleteIcon from "@mui/icons-material/Delete";

interface CotaEditMenuProps {
  cota: COTARead;
  onAnnotateSentences: (conceptId: string | null) => void;
  onRemoveSentences: () => void;
}

const CotaEditMenu = forwardRef<GenericPositionContextMenuHandle, CotaEditMenuProps>(
  ({ cota, onAnnotateSentences, onRemoveSentences }, ref) => {
    return (
      <GenericPositionMenu ref={ref}>
        <MenuItem onClick={() => onAnnotateSentences(null)}>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear annotation</ListItemText>
        </MenuItem>
        {cota.concepts.map((concept) => (
          <MenuItem onClick={() => onAnnotateSentences(concept.id)}>
            <ListItemIcon>
              <CircleIcon fontSize="small" style={{ color: concept.color }} />
            </ListItemIcon>
            <ListItemText>{concept.name}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => onRemoveSentences()}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove sentence</ListItemText>
        </MenuItem>
      </GenericPositionMenu>
    );
  },
);

export default CotaEditMenu;
