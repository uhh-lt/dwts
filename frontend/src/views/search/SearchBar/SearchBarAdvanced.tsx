import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import React, { useState } from "react";
import { Button, Card, CardActions, CardContent, Popover, Stack, TextField } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";

interface SearchBarAdvancedProps {
  anchorEl: HTMLFormElement | null;
}

function SearchBarAdvanced({ anchorEl }: SearchBarAdvancedProps) {
  // state
  const [open, setOpen] = useState<boolean>(false);

  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Tooltip title="Advanced search options">
        <span>
          <IconButton sx={{ p: "10px" }} onClick={handleOpen} disabled>
            <TuneIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        container={anchorEl}
        id="search-menu"
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        elevation={8}
        PaperProps={{}}
        disablePortal
      >
        <Card>
          <CardContent>
            <Stack>
              <TextField label="Von" variant="standard" />
              <TextField label="An" variant="standard" />
              <TextField label="B" variant="standard" />
            </Stack>
          </CardContent>
          <CardActions>
            <Button size="small">Learn More</Button>
          </CardActions>
        </Card>
      </Popover>
    </>
  );
}

export default SearchBarAdvanced;
