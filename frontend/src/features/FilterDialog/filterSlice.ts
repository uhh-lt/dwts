import { CaseReducerActions, Draft, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { LogicalOperator } from "../../api/openapi/models/LogicalOperator.ts";
import {
  ColumnInfo,
  FilterOperators,
  MyFilter,
  MyFilterExpression,
  deleteInFilter,
  filterOperator2FilterOperatorType,
  filterOperator2defaultValue,
  findInFilter,
  getDefaultOperator,
  isFilter,
  isFilterExpression,
} from "./filterUtils.ts";

export interface FilterState {
  filter: Record<string, MyFilter>;
  editableFilter: MyFilter;
  defaultFilterExpression: MyFilterExpression;
  column2Info: Record<string, ColumnInfo>;
  expertMode: boolean;
}

export const filterReducer = {
  onStartFilterEdit: (
    state: Draft<FilterState>,
    action: PayloadAction<{ rootFilterId: string; filter?: MyFilter }>,
  ) => {
    // init filter if it does not exist
    if (!state.filter[action.payload.rootFilterId]) {
      if (action.payload.filter) {
        state.filter[action.payload.rootFilterId] = action.payload.filter;
      } else {
        state.filter[action.payload.rootFilterId] = {
          id: action.payload.rootFilterId,
          items: [],
          logic_operator: LogicalOperator.AND,
        };
      }
    }
    state.editableFilter = JSON.parse(JSON.stringify(state.filter[action.payload.rootFilterId]));

    // add a default filter expression if the filter is empty
    if (state.editableFilter.items.length === 0) {
      state.editableFilter.items = [
        {
          ...state.defaultFilterExpression,
          id: uuidv4(),
        } as MyFilterExpression,
      ];
    }
  },
  onFinishFilterEdit: (state: Draft<FilterState>) => {
    state.filter = {
      ...state.filter,
      [state.editableFilter.id]: state.editableFilter,
    };
    state.editableFilter = {
      id: "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    };
  },
  addRootFilter: (state: Draft<FilterState>, action: PayloadAction<{ rootFilterId: string }>) => {
    state.filter[action.payload.rootFilterId] = {
      id: action.payload.rootFilterId,
      items: [],
      logic_operator: LogicalOperator.AND,
    };
  },
  deleteRootFilter: (state: Draft<FilterState>, action: PayloadAction<{ rootFilterId: string }>) => {
    delete state.filter[action.payload.rootFilterId];
  },
  addDefaultFilter: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string }>) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilter(filterItem)) {
      filterItem.items = [
        {
          id: uuidv4(),
          items: [],
          logic_operator: LogicalOperator.AND,
        } as MyFilter,
        ...filterItem.items,
      ];
    }
  },
  addDefaultFilterExpression: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; addEnd?: boolean }>,
  ) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilter(filterItem)) {
      if (action.payload.addEnd) {
        filterItem.items = [
          ...filterItem.items,
          {
            ...state.defaultFilterExpression,
            id: uuidv4(),
          } as MyFilterExpression,
        ];
      } else {
        filterItem.items = [
          {
            ...state.defaultFilterExpression,
            id: uuidv4(),
          } as MyFilterExpression,
          ...filterItem.items,
        ];
      }
    }
  },
  deleteFilter: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string }>) => {
    state.editableFilter = deleteInFilter(state.editableFilter, action.payload.filterId);
  },
  changeLogicalOperator: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; operator: LogicalOperator }>,
  ) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilter(filterItem)) {
      filterItem.logic_operator = action.payload.operator;
    }
  },
  changeColumn: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string; columnValue: string }>) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilterExpression(filterItem)) {
      if (parseInt(action.payload.columnValue)) {
        // it is a Metadata column: metadata columns are stored as project_metadata.id
        filterItem.column = parseInt(action.payload.columnValue);
      } else {
        // it is a proper Column
        filterItem.column = action.payload.columnValue;
      }

      const filterOperator = state.column2Info[action.payload.columnValue].operator;
      const filterOperatorType = filterOperator2FilterOperatorType[filterOperator];

      filterItem.operator = getDefaultOperator(filterOperatorType);
      filterItem.value = filterOperator2defaultValue[filterOperator];
    }
  },
  changeOperator: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; operator: FilterOperators }>,
  ) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilterExpression(filterItem)) {
      filterItem.operator = action.payload.operator;
    }
  },
  changeValue: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; value: string | number | boolean | string[] }>,
  ) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilterExpression(filterItem)) {
      filterItem.value = action.payload.value;
    }
  },
  setDefaultFilterExpression: (
    state: Draft<FilterState>,
    action: PayloadAction<{ defaultFilterExpression: MyFilterExpression }>,
  ) => {
    state.defaultFilterExpression = action.payload.defaultFilterExpression;
  },
  resetEditFilter: (state: Draft<FilterState>) => {
    state.editableFilter = {
      id: state.editableFilter.id,
      logic_operator: LogicalOperator.AND,
      items: [],
    };
  },
  resetFilter: (state: Draft<FilterState>, action: PayloadAction<{ rootFilterId?: string }>) => {
    state.filter[action.payload.rootFilterId || "root"] = {
      id: action.payload.rootFilterId || "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    };
  },
  init: (state: Draft<FilterState>, action: PayloadAction<{ columnInfo: ColumnInfo[] }>) => {
    state.column2Info = action.payload.columnInfo.reduce((acc, columnInfo) => {
      return {
        ...acc,
        [columnInfo.column]: columnInfo,
      };
    }, {});
  },
  onChangeExpertMode: (state: Draft<FilterState>, action: PayloadAction<{ expertMode: boolean }>) => {
    state.expertMode = action.payload.expertMode;
  },
};

// selectors
export const selectFilterByName = (state: FilterState, rootFilterId: string) => {
  // check if filter exists
  if (!state.filter[rootFilterId]) {
    return {
      id: rootFilterId,
      items: [],
      logic_operator: LogicalOperator.AND,
    };
  }
  return state.filter[rootFilterId];
};

export type FilterReducer = typeof filterReducer;
export type FilterActions = CaseReducerActions<FilterReducer, string>;
