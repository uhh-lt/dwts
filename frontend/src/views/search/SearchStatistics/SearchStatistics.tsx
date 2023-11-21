import { TabContext } from "@mui/lab";
import { Box, BoxProps, Tab, Tabs } from "@mui/material";
import React, { useCallback, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks";
import SearchHooks from "../../../api/SearchHooks";
import { ContextMenuPosition } from "../../../components/ContextMenu/ContextMenuPosition";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import CodeStats from "./CodeStats";
import DocumentTagStats from "./DocumentTagStats";
import KeywordStats from "./KeywordStats";
import SearchStatisticsContextMenu from "./SearchStatisticsContextMenu";
import StatsSearchBar from "./StatsSearchBar";
import { SpanEntityStat } from "../../../api/openapi";

interface SearchStatisticsProps {
  sdocIds: number[];
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
  const handleTabChange = (event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };

  // get the current project id
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // query all codes of the current project
  const projectCodes = ProjectHooks.useGetAllCodes(projectId);

  // stats
  const sortStatsByGlobal = useAppSelector((state) => state.settings.search.sortStatsByGlobal);
  const keywordStats = SearchHooks.useSearchKeywordStats(projectId, sdocIds, sortStatsByGlobal);
  const tagStats = SearchHooks.useSearchTagStats(sdocIds, sortStatsByGlobal);

  // context menu
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const openContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.pageX, y: event.pageY });
  }, []);
  const closeContextMenu = useCallback(() => {
    setContextMenuPosition(null);
  }, []);
  const handleMenuItemClick = useCallback((navigateTo: string) => {
    setTab(navigateTo);
  }, []);

  // stats search bar value state initialisation
  const [filterStatsBy, setFilterStatsBy] = useState("");
  const handleSearchTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterStatsBy(event.target.value);
  };

  // The scrollable element for the lists
  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <Box className="myFlexContainer" {...(props as BoxProps)}>
      <TabContext value={tab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
          <Tabs value={tab} onChange={handleTabChange} variant="scrollable" onContextMenu={openContextMenu}>
            <Tab label="Keywords" value="keywords" />
            <Tab label="Tags" value="tags" />
            {projectCodes.data?.map((code) => <Tab key={code.id} label={code.name} value={`${code.id}`} />)}
          </Tabs>
        </Box>

        {/* Stats Searchbar Component */}
        <Box ref={parentRef} className="myFlexFitContentContainer" sx={{ borderBottom: 1, borderColor: "divider" }}>
          <StatsSearchBar handleSearchTextChange={handleSearchTextChange} />
        </Box>

        <Box ref={parentRef} className="myFlexFillAllContainer" p={2}>
          <KeywordStats
            keywordStats={keywordStats}
            handleClick={handleKeywordClick}
            parentRef={parentRef}
            filterBy={filterStatsBy}
          />
          <DocumentTagStats
            tagStats={tagStats}
            handleClick={handleTagClick}
            parentRef={parentRef}
            filterBy={filterStatsBy}
          />
          {projectCodes.data?.map((code) => (
            <CodeStats
              currentTab={tab}
              key={code.id}
              codeId={code.id}
              sdocIds={sdocIds}
              handleClick={handleCodeClick}
              parentRef={parentRef}
              filterBy={filterStatsBy}
            />
          ))}
        </Box>
      </TabContext>
      <SearchStatisticsContextMenu
        menuItems={projectCodes.data || []}
        contextMenuData={contextMenuPosition}
        handleClose={closeContextMenu}
        handleMenuItemClick={handleMenuItemClick}
      />
    </Box>
  );
}

export default SearchStatistics;
