import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface NavState {
  navPaths: string[];
}

const initialState: NavState = {
  navPaths: [],
};

export const navSlice = createSlice({
  name: "nav",
  initialState,
  reducers: {
    setNavPaths: (state, action: PayloadAction<string>) => {
      state.navPaths.push(action.payload);
    },
    removeNavPath: (state, action: PayloadAction<string>) => {
      const remainingNavPaths = state.navPaths.filter((path) => path !== action.payload);
      state.navPaths = remainingNavPaths;
    },
  },
});

export const NavActions = navSlice.actions;

export default navSlice.reducer;
