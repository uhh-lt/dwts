import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { AnnotatedSegmentsColumns } from "../../../api/openapi/models/AnnotatedSegmentsColumns.ts";
import { LogicalOperator } from "../../../api/openapi/models/LogicalOperator.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import { FilterState, filterReducer } from "../../../features/FilterDialog/filterSlice.ts";

const initialState: FilterState = {
  filter: {
    root: {
      id: "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    },
  },
  editableFilter: {
    id: "root",
    logic_operator: LogicalOperator.AND,
    items: [],
  },
  defaultFilterExpression: {
    id: uuidv4(),
    column: AnnotatedSegmentsColumns.ASC_SOURCE_SOURCE_DOCUMENT_FILENAME,
    operator: StringOperator.STRING_CONTAINS,
    value: "",
  },
  column2Info: {},
  expertMode: false,
};

const annotatedSegmentsFilterSlice = createSlice({
  name: "annotatedSegmentsFilter",
  initialState,
  reducers: filterReducer,
});

export const AnnotatedSegmentsFilterActions = annotatedSegmentsFilterSlice.actions;

export default annotatedSegmentsFilterSlice.reducer;
