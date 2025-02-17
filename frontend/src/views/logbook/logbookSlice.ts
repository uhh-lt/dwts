import { createSlice } from "@reduxjs/toolkit";
import { MemoFilterActions } from "../../components/Memo/MemoTable/memoFilterSlice.ts";
import { ProjectActions } from "../../components/Project/projectSlice.ts";
import { initialTableState, resetProjectTableState, tableReducer } from "../../components/tableSlice.ts";

const logbookSlice = createSlice({
  name: "logbook",
  initialState: {
    ...initialTableState,
  },
  reducers: {
    ...tableReducer,
  },
  extraReducers(builder) {
    builder
      .addCase(ProjectActions.changeProject, (state) => {
        console.log("Project changed! Resetting 'logbook' state.");
        resetProjectTableState(state);
      })
      .addCase(MemoFilterActions.init, (state, action) => {
        state.columnVisibilityModel = Object.values(action.payload.columnInfoMap).reduce((acc, column) => {
          if (!column.column) return acc;
          // this is a normal column
          if (isNaN(parseInt(column.column))) {
            return acc;
            // this is a metadata column
          } else {
            return {
              ...acc,
              [column.column]: false,
            };
          }
        }, {});
      })
      .addCase(MemoFilterActions.onFinishFilterEdit, (state) => {
        // reset variables that depend on search parameters
        state.rowSelectionModel = initialTableState.rowSelectionModel;
        state.fetchSize = initialTableState.fetchSize;
      })
      .addDefaultCase(() => {});
  },
});

export const LogbookActions = logbookSlice.actions;
export default logbookSlice.reducer;
