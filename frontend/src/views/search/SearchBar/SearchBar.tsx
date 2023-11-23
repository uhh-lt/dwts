import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import {
  Card,
  CardContent,
  Checkbox,
  ClickAwayListener,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  InputBase,
  Paper,
  Popper,
  Radio,
  RadioGroup,
  Tooltip,
} from "@mui/material";
import React, { useRef, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { DocType } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { QueryType } from "../QueryType";
import { SearchActions } from "../searchSlice";
import ImageIcon from "@mui/icons-material/Image";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import FeedIcon from "@mui/icons-material/Feed";
import FeedOutlinedIcon from "@mui/icons-material/FeedOutlined";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import AudiotrackOutlinedIcon from "@mui/icons-material/AudiotrackOutlined";
import MovieIcon from "@mui/icons-material/Movie";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import { useParams } from "react-router-dom";
import { useNavigateIfNecessary } from "../hooks/useNavigateIfNecessary";
import { Query } from "@tanstack/react-query";

interface SearchFormValues {
  query: string;
}

interface SearchBarProps {
  placeholder: string;
}

function SearchBar({ placeholder }: SearchBarProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  const container = useRef<HTMLFormElement | null>(null);
  const navigateIfNecessary = useNavigateIfNecessary();

  // global client state (redux)
  const searchType = useAppSelector((state) => state.search.searchType);
  const searchQuery = useAppSelector((state) => state.search.searchQuery);
  const dispatch = useAppDispatch();

  // react hook form
  const { register, handleSubmit, reset } = useForm<SearchFormValues>({
    values: {
      query: searchQuery,
    },
  });

  // local state
  const [anchorEl, setAnchorEl] = useState<HTMLFormElement | null>(null);
  const open = Boolean(anchorEl);

  // event handlers
  const handleFocus = (event: any) => {
    event.stopPropagation();
    setAnchorEl(container.current);
  };

  const handleClose = () => {
    // TODO would be better if the listener is added/removed when the search bar is opened/closed
    if (open) {
      // clear focus
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setAnchorEl(null);
    }
  };

  const onSubmit: SubmitHandler<SearchFormValues> = (data) => {
    switch (searchType) {
      case QueryType.LEXICAL:
        dispatch(SearchActions.onChangeSearchQuery(data.query));
        dispatch(SearchActions.clearSelectedDocuments());
        navigateIfNecessary(`/project/${projectId}/search/`);
        break;
      case QueryType.SEMANTIC:
        alert("not implemented!");
        break;
    }

    handleClose();
    reset({
      query: data.query,
    });
  };

  const onSubmitError: SubmitErrorHandler<SearchFormValues> = (errors) => {
    console.error(errors);
  };

  const handleClearSearch = (event: React.MouseEvent<HTMLButtonElement>) => {
    dispatch(SearchActions.onChangeSearchQuery(""));
    dispatch(SearchActions.clearSelectedDocuments());
    navigateIfNecessary(`/project/${projectId}/search/`);

    handleClose();
    reset({
      query: "",
    });
  };

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Paper
        elevation={0}
        component="form"
        onSubmit={handleSubmit(onSubmit, onSubmitError)}
        ref={container}
        sx={{
          padding: "2px",
          display: "flex",
          alignItems: "center",
          width: "100%",
          maxWidth: "800px",
          ...(open && {
            borderBottomRightRadius: 0,
            borderBottomLeftRadius: 0,
            border: `1px solid rgba(0, 0, 0, 0.12)`,
            borderBottom: "none",
          }),
          zIndex: (theme) => theme.zIndex.appBar + 1,
        }}
      >
        <Tooltip title={"Search"}>
          <span>
            <IconButton sx={{ p: "10px" }} type="submit">
              <SearchIcon />
            </IconButton>
          </span>
        </Tooltip>
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder={placeholder}
          {...register("query")}
          autoComplete="off"
          onFocus={handleFocus}
        />
        <Tooltip title={"Clear search"}>
          <span>
            <IconButton sx={{ p: "10px" }} onClick={handleClearSearch}>
              <ClearIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Popper
          open={open}
          anchorEl={anchorEl}
          sx={{ zIndex: (theme) => theme.zIndex.appBar + 1, width: "800px" }}
          style={{ marginTop: "-3px !important" }}
        >
          <Card variant="outlined" sx={{ borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            <CardContent>
              <FormControl>
                <FormLabel id="radio-buttons-group-query">Query Type</FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="radio-buttons-group-query"
                  value={searchType}
                  onChange={(event, value) => dispatch(SearchActions.setSearchType(value as QueryType))}
                  name="radio-buttons-group"
                >
                  {Object.values(QueryType).map((qt) => (
                    <FormControlLabel
                      key={qt}
                      value={qt}
                      control={<Radio />}
                      label={qt}
                      disabled={qt === QueryType.SEMANTIC}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>
        </Popper>
      </Paper>
    </ClickAwayListener>
  );
}

export default SearchBar;
