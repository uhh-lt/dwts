import { Stack } from "@mui/material";
import React from "react";
import { RootState } from "../../../store/store.ts";
import ReduxFilterDialog from "../../FilterDialog/ReduxFilterDialog.tsx";
import MemoDeleteButton from "../MemoDeleteButton.tsx";
import MemoStarButton from "../MemoStarButton.tsx";
import { MemoToolbarProps } from "./MemoToolbarProps.ts";
import { MemoFilterActions } from "./memoFilterSlice.ts";

const filterStateSelector = (state: RootState) => state.memoFilter;

function MemoToolbarLeft({
  anchor,
  filterName,
  leftChildren,
  rightChildren,
  selectedMemos,
}: MemoToolbarProps & { leftChildren?: React.ReactNode; rightChildren?: React.ReactNode }) {
  const selectedMemoIds = selectedMemos.map((memo) => memo.document_id);
  return (
    <Stack direction={"row"} spacing={1} alignItems="center">
      {leftChildren}
      <ReduxFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filterStateSelector={filterStateSelector}
        filterActions={MemoFilterActions}
      />
      {selectedMemoIds.length > 0 && (
        <>
          <MemoDeleteButton memoIds={selectedMemoIds} />
          <MemoStarButton memoIds={selectedMemoIds} isStarred={true} />
          <MemoStarButton memoIds={selectedMemoIds} isStarred={false} />
        </>
      )}
      {rightChildren}
    </Stack>
  );
}

export default MemoToolbarLeft;
