import PublicIcon from "@mui/icons-material/Public";
import PublicOffIcon from "@mui/icons-material/PublicOff";
import SearchIcon from "@mui/icons-material/Search";
import { TabContext } from "@mui/lab";
import { Box, BoxProps, IconButton, Stack, Tab, Tabs, TextField, Tooltip } from "@mui/material";
import React, { useCallback, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import CodeHooks from "../../../api/CodeHooks.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../DocumentSearch/searchSlice.ts";
import CodeStats from "./CodeStats.tsx";
import DocumentTagStats from "./DocumentTagStats.tsx";
import KeywordStats from "./KeywordStats.tsx";
import SearchStatisticsMenu from "./SearchStatisticsMenu.tsx";

interface SearchStatisticsProps {
  sdocIds?: number[];
  handleKeywordClick: (keyword: string) => void;
  handleTagClick: (tagId: number) => void;
  handleCodeClick: (stat: SpanEntityStat) => void;
}

function SearchStatistics({
  sdocIds,
  handleCodeClick,
  handleKeywordClick,
  handleTagClick,
  ...props
}: SearchStatisticsProps & BoxProps) {
  // tabs
  const [tab, setTab] = useState("keywords");
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };

  // get the current project id
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // query all codes of the current project
  const projectCodes = CodeHooks.useGetEnabledCodes();

  // menu
  const handleMenuItemClick = useCallback((navigateTo: string) => {
    setTab(navigateTo);
  }, []);

  // stats search bar value state initialisation
  const [filterStatsBy, setFilterStatsBy] = useState("");
  const handleSearchTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterStatsBy(event.target.value);
  };

  // toggle sort by global
  const dispatch = useAppDispatch();
  const sortStatsByGlobal = useAppSelector((state) => state.search.sortStatsByGlobal);
  const toggleSortStatsByGlobal = () => {
    dispatch(SearchActions.onToggleSortStatsByGlobal());
  };

  // The scrollable element for the lists
  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <Box className="myFlexContainer" {...(props as BoxProps)}>
      <TabContext value={tab}>
        <Stack
          direction="row"
          alignItems="center"
          sx={{ borderBottom: 1, borderColor: "divider" }}
          className="myFlexFitContentContainer"
        >
          <SearchStatisticsMenu
            menuItems={projectCodes.data || []}
            handleMenuItemClick={handleMenuItemClick}
            sx={{ ml: 1 }}
          />
          <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
            <Tab label="Keywords" value="keywords" />
            <Tab label="Tags" value="tags" />
            {projectCodes.data?.map((code) => <Tab key={code.id} label={code.name} value={`${code.id}`} />)}
          </Tabs>
        </Stack>

        {/* Stats Searchbar Component */}
        <Box ref={parentRef} className="myFlexFitContentContainer" sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Stack direction="row" alignItems="center" spacing={2} pl={2}>
            <SearchIcon sx={{ color: "dimgray" }} />
            <TextField
              sx={{ "& fieldset": { border: "none" }, input: { color: "dimgray", paddingY: "12px" } }}
              placeholder="Search..."
              variant="outlined"
              onChange={handleSearchTextChange}
              fullWidth
            />
            <Tooltip title="Sort stats by global">
              <IconButton onClick={toggleSortStatsByGlobal}>
                {sortStatsByGlobal ? <PublicIcon /> : <PublicOffIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        <Box ref={parentRef} className="myFlexFillAllContainer" p={2}>
          <KeywordStats
            sdocIds={sdocIds}
            currentTab={tab}
            projectId={projectId}
            handleClick={handleKeywordClick}
            parentRef={parentRef}
            filterBy={filterStatsBy}
          />
          <DocumentTagStats
            sdocIds={sdocIds}
            currentTab={tab}
            projectId={projectId}
            handleClick={handleTagClick}
            parentRef={parentRef}
            filterBy={filterStatsBy}
          />
          {projectCodes.data?.map((code) => (
            <CodeStats
              sdocIds={sdocIds}
              currentTab={tab}
              key={code.id}
              codeId={code.id}
              handleClick={handleCodeClick}
              parentRef={parentRef}
              filterBy={filterStatsBy}
            />
          ))}
        </Box>
      </TabContext>
    </Box>
  );
}

export default SearchStatistics;
