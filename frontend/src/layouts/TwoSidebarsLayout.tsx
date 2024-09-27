import { Grid } from "@mui/material";
import { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../plugins/ReduxHooks.ts";
import LayoutManipulationButtons from "./LayoutManipulationButtons.tsx";
import { LayoutActions } from "./layoutSlice.ts";
function TwoSidebarsLayout({
  leftSidebar,
  content,
  rightSidebar,
}: {
  leftSidebar: ReactNode;
  content: ReactNode;
  rightSidebar: ReactNode;
}) {
  const leftSidebarSize = useAppSelector((state) => state.layout.leftSidebarSize);
  const rightSidebarSize = useAppSelector((state) => state.layout.rightSidebarSize);
  const contentSize = useAppSelector((state) => state.layout.contentSize);
  const dispatch = useAppDispatch();

  return (
    <Grid container className="h100">
      {leftSidebarSize > 0 && (
        <Grid
          item
          md={leftSidebarSize}
          className="h100"
          sx={{
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: (theme) => theme.palette.background.paper,
            borderRight: "1px solid #e8eaed",
            boxShadow: 4,
          }}
        >
          {leftSidebar}
        </Grid>
      )}
      <Grid
        item
        md={contentSize}
        className="myFlexContainer h100"
        sx={{
          bgcolor: (theme) => theme.palette.grey[200],
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
        }}
      >
        <LayoutManipulationButtons
          onDecreaseClick={() => dispatch(LayoutActions.onDecreaseLeft())}
          onIncreaseClick={() => dispatch(LayoutActions.onIncreaseLeft())}
          isLeft={true}
        />
        <LayoutManipulationButtons
          onDecreaseClick={() => dispatch(LayoutActions.onDecreaseRight())}
          onIncreaseClick={() => dispatch(LayoutActions.onIncreaseRight())}
          isLeft={false}
        />
        {content}
      </Grid>
      {rightSidebarSize > 0 && (
        <Grid
          item
          md={rightSidebarSize}
          className="h100"
          sx={{
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: (theme) => theme.palette.background.paper,
            borderLeft: "1px solid #e8eaed",
            boxShadow: 4,
          }}
        >
          {rightSidebar}
        </Grid>
      )}
    </Grid>
  );
}

export default TwoSidebarsLayout;
