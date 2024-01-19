import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { COTAConcept, COTATrainingSettings, DimensionalityReductionAlgorithm } from "../../../api/openapi";

export interface CotaState {
  conceptEditorOpen: boolean;
  currentConcept: COTAConcept;
  provenanceDate: string | undefined;
  provenanceSdocIdSentenceId: string | undefined;
  provenanceConcept: string | undefined;
  selectedConceptId: string | undefined;
  isTimelineView: boolean;
  // COTATrainingSettings.tsx
  trainingSettings: COTATrainingSettings;
  trainingSettingsOpen: boolean;
}

const initialState: CotaState = {
  conceptEditorOpen: false,
  currentConcept: {
    id: "1",
    name: "",
    description: "",
    color: "#ff0000",
    visible: true,
  },
  selectedConceptId: undefined,
  provenanceDate: undefined,
  provenanceSdocIdSentenceId: undefined,
  provenanceConcept: undefined,
  isTimelineView: false,
  // COTATrainingSettings.tsx
  trainingSettings: {
    dimensionality_reduction_algorithm: DimensionalityReductionAlgorithm.UMAP,
    dimensions: 64,
    epochs: 5,
    layers: 5,
    min_required_annotations_per_concept: 5,
    search_space_threshold: 0.8,
    search_space_topk: 1000,
  },
  trainingSettingsOpen: false,
};

export const cotaSlice = createSlice({
  name: "cota",
  initialState,
  reducers: {
    setCurrentConcept: (state, action: PayloadAction<COTAConcept>) => {
      state.currentConcept = action.payload;
    },
    resetCurrentConcept: (state) => {
      state.currentConcept = initialState.currentConcept;
    },
    setProvenanceDate: (state, action: PayloadAction<string | undefined>) => {
      state.provenanceDate = action.payload;
    },
    setProvenanceConcept: (state, action: PayloadAction<string | undefined>) => {
      state.provenanceConcept = action.payload;
    },
    onStartConceptEdit: (state, action: PayloadAction<{ concept: COTAConcept }>) => {
      state.conceptEditorOpen = true;
      state.currentConcept = action.payload.concept;
    },
    onFinishConceptEdit: (state, action: PayloadAction<{ concept: COTAConcept }>) => {
      state.conceptEditorOpen = false;
      state.currentConcept = initialState.currentConcept;
    },
    onCancelConceptEdit: (state) => {
      state.conceptEditorOpen = false;
      state.currentConcept = initialState.currentConcept;
    },
    onSelectConcept: (state, action: PayloadAction<{ conceptId: string }>) => {
      if (state.selectedConceptId === action.payload.conceptId) {
        state.selectedConceptId = undefined;
        return;
      }
      state.selectedConceptId = action.payload.conceptId;
    },
    onToggleTimelineView: (state) => {
      state.isTimelineView = !state.isTimelineView;
    },
    onSentenceAnnotatorRowClick: (state, action: PayloadAction<string | undefined>) => {
      if (state.provenanceSdocIdSentenceId === action.payload) {
        state.provenanceSdocIdSentenceId = undefined;
      } else {
        state.provenanceSdocIdSentenceId = action.payload;
      }
    },
    onScatterPlotDotClick: (state, action: PayloadAction<string | undefined>) => {
      if (state.provenanceSdocIdSentenceId === action.payload) {
        state.provenanceSdocIdSentenceId = undefined;
      } else {
        state.provenanceSdocIdSentenceId = action.payload;
      }
    },
    onOpenTrainingSettings: (state, action: PayloadAction<{ trainingSettings: COTATrainingSettings }>) => {
      state.trainingSettingsOpen = true;
      state.trainingSettings = action.payload.trainingSettings;
    },
    onCloseTrainingSettings: (state) => {
      state.trainingSettingsOpen = false;
      state.trainingSettings = initialState.trainingSettings;
    },
  },
});

export const CotaActions = cotaSlice.actions;

export default cotaSlice.reducer;
