import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { v4 as uuidv4 } from "uuid";
import { IDListOperator } from "../../../api/openapi/models/IDListOperator.ts";
import { ListOperator } from "../../../api/openapi/models/ListOperator.ts";
import { LogicalOperator } from "../../../api/openapi/models/LogicalOperator.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { SdocColumns } from "../../../api/openapi/models/SdocColumns.ts";
import { SourceDocumentMetadataRead } from "../../../api/openapi/models/SourceDocumentMetadataRead.ts";
import { StringOperator } from "../../../api/openapi/models/StringOperator.ts";
import {
  FilterState,
  createInitialFilterState,
  filterReducer,
  getOrCreateFilter,
  resetProjectFilterState,
} from "../../../components/FilterDialog/filterSlice.ts";
import {
  ColumnInfo,
  MyFilterExpression,
  filterOperator2FilterOperatorType,
  getDefaultOperator,
} from "../../../components/FilterDialog/filterUtils.ts";
import { ProjectActions } from "../../../components/Project/projectSlice.ts";
import { TableState, initialTableState, resetProjectTableState, tableReducer } from "../../../components/tableSlice.ts";
import { getValue } from "../metadataUtils.ts";

interface SearchState {
  // project state:
  selectedDocumentId: number | undefined; // the id of the selected document. Used to highlight the selected document in the table, and to show the document information (tags, metadata etc.).
  expandedTagIds: string[]; // the ids of the tags that are expanded in the tag tree.
  // app state:
  expertSearchMode: boolean; // whether the expert search mode is enabled.
  sortStatsByGlobal: boolean; // whether the search statistics are sorted by the global frequency or the "local" ().
}

const defaultFilterExpression: MyFilterExpression = {
  id: uuidv4(),
  column: SdocColumns.SD_SOURCE_DOCUMENT_FILENAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

const initialState: FilterState & TableState & SearchState = {
  ...initialTableState,
  ...createInitialFilterState(defaultFilterExpression),
  // project state:
  selectedDocumentId: undefined,
  expandedTagIds: [],
  // app state:
  expertSearchMode: false,
  sortStatsByGlobal: false,
};

export const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    ...tableReducer,
    ...filterReducer,
    // extend filterReducer's init
    init: (state, action: PayloadAction<{ columnInfoMap: Record<string, ColumnInfo> }>) => {
      filterReducer.init(state, action);
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
    },
    // document selection
    onToggleSelectedDocumentIdChange: (state, action: PayloadAction<number | undefined>) => {
      // toggle
      if (state.selectedDocumentId === action.payload) {
        state.selectedDocumentId = undefined;
      } else {
        state.selectedDocumentId = action.payload;
      }
    },
    updateSelectedDocumentsOnMultiDelete: (state, action: PayloadAction<number[]>) => {
      for (const sdocId of action.payload) {
        delete state.rowSelectionModel[`${sdocId}`];
      }
    },
    // tag explorer
    setExpandedTagIds: (state, action: PayloadAction<string[]>) => {
      state.expandedTagIds = action.payload;
    },
    expandTags: (state, action: PayloadAction<string[]>) => {
      for (const tagId of action.payload) {
        if (state.expandedTagIds.indexOf(tagId) === -1) {
          state.expandedTagIds.push(tagId);
        }
      }
    },
    // search statistics
    onToggleSortStatsByGlobal: (state) => {
      state.sortStatsByGlobal = !state.sortStatsByGlobal;
    },
    // expert mode
    onChangeExpertSearchMode: (state, action: PayloadAction<boolean>) => {
      state.expertSearchMode = action.payload;
    },
    // filtering
    onAddKeywordFilter: (
      state,
      action: PayloadAction<{ keywordMetadataIds: number[]; keyword: string; filterName: string }>,
    ) => {
      const filterItems: MyFilterExpression[] = action.payload.keywordMetadataIds?.map((keywordMetadataId) => {
        return {
          id: uuidv4(),
          column: keywordMetadataId,
          operator: ListOperator.LIST_CONTAINS,
          value: [action.payload.keyword],
        };
      });

      const currentFilter = getOrCreateFilter(state, action.payload.filterName);
      currentFilter.items = [
        ...currentFilter.items,
        {
          id: uuidv4(),
          logic_operator: LogicalOperator.OR,
          items: filterItems,
        },
      ];
    },
    onAddTagFilter: (state, action: PayloadAction<{ tagId: number | string; filterName: string }>) => {
      const currentFilter = getOrCreateFilter(state, action.payload.filterName);
      currentFilter.items = [
        ...currentFilter.items,
        {
          id: uuidv4(),
          column: SdocColumns.SD_DOCUMENT_TAG_ID_LIST,
          operator: IDListOperator.ID_LIST_CONTAINS,
          value: action.payload.tagId,
        },
      ];
    },
    onAddSpanAnnotationFilter: (
      state,
      action: PayloadAction<{ codeId: number; spanText: string; filterName: string }>,
    ) => {
      const currentFilter = getOrCreateFilter(state, action.payload.filterName);
      currentFilter.items = [
        ...currentFilter.items,
        {
          id: uuidv4(),
          column: SdocColumns.SD_SPAN_ANNOTATIONS,
          operator: ListOperator.LIST_CONTAINS,
          value: [action.payload.codeId.toString(), action.payload.spanText],
        },
      ];
    },
    onAddMetadataFilter: (
      state,
      action: PayloadAction<{
        metadata: SourceDocumentMetadataRead;
        projectMetadata: ProjectMetadataRead;
        filterName: string;
      }>,
    ) => {
      // the column of a metadata filter is the project_metadata_id
      const filterOperator = state.column2Info[action.payload.metadata.project_metadata_id.toString()].operator;
      const filterOperatorType = filterOperator2FilterOperatorType[filterOperator];

      const currentFilter = getOrCreateFilter(state, action.payload.filterName);
      currentFilter.items = [
        ...currentFilter.items,
        {
          id: uuidv4(),
          column: action.payload.metadata.project_metadata_id,
          operator: getDefaultOperator(filterOperatorType),
          value: getValue(action.payload.metadata, action.payload.projectMetadata)!,
        },
      ];
    },
  },
  extraReducers(builder) {
    builder
      .addCase(ProjectActions.changeProject, (state, action) => {
        console.log("Project changed! Resetting 'search' state.");
        state.selectedDocumentId = initialState.selectedDocumentId;
        state.expandedTagIds = initialState.expandedTagIds;
        resetProjectTableState(state);
        resetProjectFilterState({ state, defaultFilterExpression, projectId: action.payload, sliceName: "search" });
      })
      .addMatcher(
        (action) =>
          (action.type.startsWith("search/onAdd") && action.type.toLowerCase().includes("filter")) || // add filter
          (action.type.startsWith("search/") && action.type.includes("onFinishFilterEdit")), // edit filter
        (state) => {
          console.log("Search filters changed! Resetting search parameter dependent variables.");
          // reset variables that depend on search parameters
          state.rowSelectionModel = initialTableState.rowSelectionModel;
          state.fetchSize = initialTableState.fetchSize;
        },
      );
  },
});

// actions
export const SearchActions = searchSlice.actions;

export default persistReducer(
  {
    key: "search",
    storage,
  },
  searchSlice.reducer,
);
