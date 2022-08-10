import { IconButton, InputBase, Paper } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import React from "react";
import { UseFormRegister } from "react-hook-form";
import SearchBarAdvanced from "./SearchBarAdvanced";

interface SearchBarProps {
  register: UseFormRegister<Record<string, any>>;
  handleSubmit: any;
  handleClearSearch: () => void;
  placeholder: string;
}

function SearchBar({ handleSubmit, register, handleClearSearch, placeholder }: SearchBarProps) {
  const container = React.useRef<HTMLFormElement | null>(null);

  return (
    <Paper
      component="form"
      elevation={0}
      sx={{ p: "2px", display: "flex", alignItems: "center", width: "100%", maxWidth: "800px" }}
      onSubmit={handleSubmit}
      ref={container}
    >
      <IconButton sx={{ p: "10px" }} type="submit">
        <SearchIcon />
      </IconButton>
      <InputBase sx={{ ml: 1, flex: 1 }} placeholder={placeholder} {...register("query")} />
      <IconButton sx={{ p: "10px" }} onClick={() => handleClearSearch()}>
        <ClearIcon />
      </IconButton>
      <SearchBarAdvanced anchorEl={container.current} />
    </Paper>
  );
}

export default SearchBar;
