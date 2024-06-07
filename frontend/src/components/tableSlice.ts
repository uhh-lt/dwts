import { Draft, PayloadAction } from "@reduxjs/toolkit";
import {
  MRT_ColumnSizingState,
  MRT_DensityState,
  MRT_PaginationState,
  MRT_RowSelectionState,
  MRT_SortingState,
  MRT_VisibilityState,
} from "material-react-table";

export interface TableState {
  searchQuery: string;
  rowSelectionModel: MRT_RowSelectionState;
  paginationModel: MRT_PaginationState;
  sortingModel: MRT_SortingState;
  columnVisibilityModel: MRT_VisibilityState;
  columnSizingModel: MRT_ColumnSizingState;
  gridDensity: MRT_DensityState;
}

export const initialTableState: TableState = {
  searchQuery: "",
  rowSelectionModel: {},
  paginationModel: {
    pageIndex: 0,
    pageSize: 10,
  },
  sortingModel: [],
  columnVisibilityModel: {},
  columnSizingModel: {},
  gridDensity: "comfortable",
};

export const tableReducer = {
  // query
  onSearchQueryChange: (state: Draft<TableState>, action: PayloadAction<string>) => {
    state.searchQuery = action.payload;
  },
  // selection
  onRowSelectionModelChange: (state: Draft<TableState>, action: PayloadAction<MRT_RowSelectionState>) => {
    state.rowSelectionModel = action.payload;
  },
  // pagination
  onPaginationModelChange: (state: Draft<TableState>, action: PayloadAction<MRT_PaginationState>) => {
    state.paginationModel = action.payload;
  },
  // sorting
  onSortModelChange: (state: Draft<TableState>, action: PayloadAction<MRT_SortingState>) => {
    state.sortingModel = action.payload;
  },
  // column visibility
  onColumnVisibilityChange: (state: Draft<TableState>, action: PayloadAction<MRT_VisibilityState>) => {
    state.columnVisibilityModel = action.payload;
  },
  // column sizing
  onColumnSizingChange: (state: Draft<TableState>, action: PayloadAction<MRT_ColumnSizingState>) => {
    state.columnSizingModel = action.payload;
  },
  // density
  onGridDensityChange: (state: Draft<TableState>, action: PayloadAction<MRT_DensityState>) => {
    state.gridDensity = action.payload;
  },
};
