import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Box, ListItem, ListItemButton, Tooltip } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import { COTAConcept } from "../../../api/openapi";

interface CotaConceptListItemProps {
  concept: COTAConcept;
  selectedConceptId: string | undefined;
  onSelect: (concept: COTAConcept) => void;
  onEditClick: (concept: COTAConcept) => void;
  onDeleteClick: (concept: COTAConcept) => void;
  onToggleVisibilityClick: (concept: COTAConcept) => void;
}

function CotaConceptListItem({
  concept,
  selectedConceptId,
  onSelect,
  onEditClick,
  onDeleteClick,
  onToggleVisibilityClick,
}: CotaConceptListItemProps) {
  return (
    <ListItem
      secondaryAction={
        <>
          <Tooltip
            title={concept.visible ? "Hide concept in timeline analysis" : "Show concept in timeline analysis"}
            enterDelay={500}
          >
            <IconButton aria-label="visible" onClick={() => onToggleVisibilityClick(concept)}>
              {concept.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={"Edit concept"} enterDelay={500}>
            <IconButton aria-label="edit" onClick={() => onEditClick(concept)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={"Delete concept"} enterDelay={500}>
            <IconButton edge="end" aria-label="delete" onClick={() => onDeleteClick(concept)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </>
      }
      disablePadding
    >
      <ListItemButton selected={selectedConceptId === concept.id} onClick={() => onSelect(concept)}>
        <Box minWidth="56px">
          <Box sx={{ width: 16, height: 16, backgroundColor: concept.color, ml: "4px", mr: 1, borderRadius: "100%" }} />
        </Box>
        <ListItemText primary={concept.name} />
      </ListItemButton>
    </ListItem>
  );
}

export default CotaConceptListItem;
