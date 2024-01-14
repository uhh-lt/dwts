import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { COTAConcept, DateGroupBy } from "../../../api/openapi";

export interface CotaState {
  selectedUserIds: number[] | undefined;
  groupBy: DateGroupBy;
  projectMetadataId: number;
  metadataCheckerOpen: boolean;
  conceptEditorOpen: boolean;
  currentConcept: COTAConcept;
  provenanceDate: string | undefined;
  provenanceConcept: string | undefined;
  selectedConceptId: string | undefined;
  rowSelectionModel: string[];
}

const initialState: CotaState = {
  selectedUserIds: undefined,
  groupBy: DateGroupBy.YEAR,
  projectMetadataId: -1,
  metadataCheckerOpen: false,
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
  provenanceConcept: undefined,
  rowSelectionModel: [],
};

export const cotaSlice = createSlice({
  name: "cota",
  initialState,
  reducers: {
    setSelectedUserIds: (state, action: PayloadAction<number[]>) => {
      state.selectedUserIds = action.payload;
    },
    setGroupBy: (state, action: PayloadAction<DateGroupBy>) => {
      state.groupBy = action.payload;
    },
    setProjectMetadataKey: (state, action: PayloadAction<number>) => {
      state.projectMetadataId = action.payload;
    },
    setMetadataCheckerOpen: (state, action: PayloadAction<boolean>) => {
      state.metadataCheckerOpen = action.payload;
    },
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
    onSelectionModelChange: (state, action: PayloadAction<string[]>) => {
      state.rowSelectionModel = action.payload;
    },
  },
});

export const CotaActions = cotaSlice.actions;

export default cotaSlice.reducer;
