import SettingsIcon from "@mui/icons-material/Settings";
import { Box, FormControlLabel, IconButton, Popover, Switch, Tooltip } from "@mui/material";
import { useState } from "react";

interface SearchMemoOptionsMenuProps {
  isSearchContent: boolean;
  onChangeIsSearchContent: (isSearchContent: boolean) => void;
}

function MemoTableOptionsMenu({ isSearchContent, onChangeIsSearchContent }: SearchMemoOptionsMenuProps) {
  // local state
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Search options">
        <IconButton onClick={(event) => setAnchorEl(anchorEl ? null : event.currentTarget)}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
            },
          },
        }}
      >
        <Box>
          <FormControlLabel
            control={
              <Switch checked={isSearchContent} onChange={(event) => onChangeIsSearchContent(event.target.checked)} />
            }
            label="Search title / content"
            sx={{ ml: "-9px" }}
          />
        </Box>
      </Popover>
    </>
  );
}

export default MemoTableOptionsMenu;
