import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import { Button, ListItem, ListItemButton, ListItemIcon } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import { v4 as uuidv4 } from "uuid";
import CotaHooks from "../../../api/CotaHooks";
import { COTAConcept, COTARead } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import CotaConceptEditor from "./CotaConceptEditor";
import CotaConceptListItem from "./CotaConceptListItem";
import { CotaActions } from "./cotaSlice";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";

interface CotaConceptListProps {
  cota: COTARead;
}

function CotaConceptList({ cota }: CotaConceptListProps) {
  // global client state (redux)
  const selectedConceptId = useAppSelector((state) => state.cota.selectedConceptId);
  const dispatch = useAppDispatch();

  // mutations
  const updateCota = CotaHooks.useUpdateCota();
  const refineCota = CotaHooks.useRefineCota();

  // actions
  const handleAddConcept = () => {
    const conceptId = uuidv4();
    updateCota.mutate({
      cotaId: cota.id,
      requestBody: {
        ...cota,
        concepts: [
          ...cota.concepts,
          {
            id: conceptId,
            name: `Concept ${cota.concepts.length + 1}`,
            description: "",
            color: "#000000",
            visible: true,
          },
        ],
      },
    });
  };

  const handleDeleteConcept = (concept: COTAConcept) => {
    const cotaConcepts = JSON.parse(JSON.stringify(cota.concepts)) as COTAConcept[];
    const index = cotaConcepts.findIndex((c) => c.id === concept.id);
    if (index !== -1) {
      cotaConcepts.splice(index, 1);
      updateCota.mutate({
        cotaId: cota.id,
        requestBody: {
          ...cota,
          concepts: cotaConcepts,
        },
      });
    }
  };

  const handleToggleVisibilityConcept = (concept: COTAConcept) => {
    const cotaConcepts = JSON.parse(JSON.stringify(cota.concepts)) as COTAConcept[];
    const index = cotaConcepts.findIndex((c) => c.id === concept.id);
    if (index !== -1) {
      cotaConcepts[index].visible = !cotaConcepts[index].visible;
      updateCota.mutate({
        cotaId: cota.id,
        requestBody: {
          ...cota,
          concepts: cotaConcepts,
        },
      });
    }
  };

  const handleApplyConceptChanges = (concept: COTAConcept) => {
    dispatch(CotaActions.onFinishConceptEdit({ concept }));
    const cotaConcepts = JSON.parse(JSON.stringify(cota.concepts)) as COTAConcept[];
    const index = cotaConcepts.findIndex((c) => c.id === concept.id);
    if (index !== -1) {
      cotaConcepts[index] = concept;
      updateCota.mutate({
        cotaId: cota.id,
        requestBody: {
          ...cota,
          concepts: cotaConcepts,
        },
      });
    }
  };

  const handleStartEditConcept = (concept: COTAConcept) => {
    dispatch(CotaActions.onStartConceptEdit({ concept }));
  };

  const handleCancelConceptChanges = (concept: COTAConcept) => {
    dispatch(CotaActions.onCancelConceptEdit());
  };

  const handleRefineCota = () => {
    refineCota.mutate(
      {
        cotaId: cota.id,
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Refining CotA '${data.cota.name}', Job ID: '${data.id}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const handleSelectConcept = (concept: COTAConcept) => {
    dispatch(CotaActions.onSelectConcept({ conceptId: concept.id }));
  };

  return (
    <>
      <Card className="myFlexContainer h100">
        <CardHeader
          className="myFlexFitContentContainer"
          action={
            <IconButton aria-label="info">
              <InfoIcon />
            </IconButton>
          }
          title="Concepts"
          subheader="The concepts to be analyzed in the timeline"
        />
        <CardContent className="myFlexFillAllContainer">
          <Button>Reset</Button>
          <Button onClick={handleRefineCota}>Start</Button>
          <List sx={{ width: "100%", bgcolor: "background.paper" }}>
            <ListItem disablePadding>
              <ListItemButton onClick={handleAddConcept}>
                <ListItemIcon>
                  <AddIcon />
                </ListItemIcon>
                <ListItemText primary="Add new concept" />
              </ListItemButton>
            </ListItem>
            {cota.concepts.map((concept) => (
              <CotaConceptListItem
                key={concept.id}
                concept={concept}
                selectedConceptId={selectedConceptId}
                onSelect={handleSelectConcept}
                onEditClick={handleStartEditConcept}
                onDeleteClick={handleDeleteConcept}
                onToggleVisibilityClick={handleToggleVisibilityConcept}
              />
            ))}
          </List>
        </CardContent>
      </Card>
      <CotaConceptEditor onUpdate={handleApplyConceptChanges} onCancel={handleCancelConceptChanges} />
    </>
  );
}

export default CotaConceptList;
