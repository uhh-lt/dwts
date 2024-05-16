import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { RootState } from "../../store/store.ts";

export interface AnnoState {
  isAnnotationMode: boolean;
  codesForSelection: CodeRead[];
  selectedDocumentTagId: number | undefined;
  selectedCodeId: number | undefined;
  expandedCodeIds: string[];
  hiddenCodeIds: number[];
  visibleAdocIds: number[];
}

const initialState: AnnoState = {
  isAnnotationMode: false,
  codesForSelection: [],
  selectedDocumentTagId: undefined,
  selectedCodeId: undefined,
  expandedCodeIds: [],
  hiddenCodeIds: [],
  visibleAdocIds: [],
};

export const annoSlice = createSlice({
  name: "anno",
  initialState,
  reducers: {
    onToggleAnnotationMode: (state) => {
      state.isAnnotationMode = !state.isAnnotationMode;
    },
    setCodesForSelection: (state, action: PayloadAction<CodeRead[]>) => {
      state.codesForSelection = action.payload;
    },
    toggleCodeVisibility: (state, action: PayloadAction<number[]>) => {
      if (action.payload.length === 0) {
        return;
      }
      const codeId = action.payload[0];
      const hiddenCodeIds = state.hiddenCodeIds;
      if (hiddenCodeIds.indexOf(codeId) === -1) {
        // add codes
        action.payload.forEach((codeId) => {
          if (hiddenCodeIds.indexOf(codeId) === -1) {
            hiddenCodeIds.push(codeId);
          }
        });
      } else {
        // delete codes
        action.payload.forEach((codeId) => {
          const index = hiddenCodeIds.indexOf(codeId);
          if (index !== -1) {
            hiddenCodeIds.splice(index, 1);
          }
        });
      }
      state.hiddenCodeIds = hiddenCodeIds;
    },
    setSelectedCodeId: (state, action: PayloadAction<number | undefined>) => {
      state.selectedCodeId = action.payload;
    },
    setExpandedCodeIds: (state, action: PayloadAction<string[]>) => {
      state.expandedCodeIds = action.payload;
    },
    expandCodes: (state, action: PayloadAction<string[]>) => {
      for (const codeId of action.payload) {
        if (state.expandedCodeIds.indexOf(codeId) === -1) {
          state.expandedCodeIds.push(codeId);
        }
      }
    },
    setSelectedDocumentTagId: (state, action: PayloadAction<number | undefined>) => {
      state.selectedDocumentTagId = action.payload;
    },
    setVisibleAdocIds: (state, action: PayloadAction<number[]>) => {
      state.visibleAdocIds = action.payload;
    },
    moveCodeToTop: (state, action: PayloadAction<CodeRead>) => {
      // makes most recently used order
      const codeId = action.payload.id;
      const idx = state.codesForSelection.findIndex((t) => t.id === codeId);
      const code = state.codesForSelection[idx];
      state.codesForSelection.splice(idx, 1);
      state.codesForSelection.unshift(code);
    },
  },
});

export const AnnoActions = annoSlice.actions;

export const isHiddenCodeId = (codeId: number) => (state: RootState) =>
  state.annotations.hiddenCodeIds.indexOf(codeId) !== -1;

export default annoSlice.reducer;
