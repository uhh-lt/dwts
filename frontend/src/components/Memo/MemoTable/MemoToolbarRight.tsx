import { Stack } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_ToggleDensePaddingButton } from "material-react-table";
import React from "react";
import ExporterButton from "../../Exporter/ExporterButton.tsx";
import { MemoToolbarProps } from "./MemoToolbarProps.ts";

function MemoToolbarRight({
  table,
  leftChildren,
  rightChildren,
}: MemoToolbarProps & { leftChildren?: React.ReactNode; rightChildren?: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {leftChildren}
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <ExporterButton
        tooltip="Export memos"
        exporterInfo={{ type: "Memos", singleUser: true, users: [], sdocId: -1 }}
      />
      {rightChildren}
    </Stack>
  );
}

export default MemoToolbarRight;
