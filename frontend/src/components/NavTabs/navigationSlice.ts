import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface NavState {
  navPaths: string[];
}

const initialState: NavState = {
  navPaths: ["/projects"],
};

export const navSlice = createSlice({
  name: "nav",
  initialState,
  reducers: {
    addNavPaths: (state, action: PayloadAction<string>) => {
      if (state.navPaths.indexOf(action.payload) === -1) {
        state.navPaths.push(action.payload);
      }
    },
    removeNavPath: (state, action: PayloadAction<string>) => {
      const remainingNavPaths = state.navPaths.filter((path) => path !== action.payload);
      state.navPaths = remainingNavPaths;
    },
  },
});

export const NavActions = navSlice.actions;

export default navSlice.reducer;
