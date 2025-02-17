import { TabPanel } from "@mui/lab";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import SearchHooks from "../../../api/SearchStatisticsHooks.ts";
import { KeywordStat } from "../../../api/openapi/models/KeywordStat.ts";
import StatsDisplayButton from "./StatsDisplayButton.tsx";
import { useFilterStats } from "./useFilterStats.ts";

interface KeywordStatsProps {
  currentTab: string;
  sdocIds?: number[];
  projectId: number;
  handleClick: (keyword: string) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

function KeywordStats(props: KeywordStatsProps) {
  if (props.currentTab !== `keywords`) {
    return null;
  } else {
    return <KeywordStatsContent {...props} />;
  }
}

function KeywordStatsContent({ projectId, sdocIds, ...props }: KeywordStatsProps) {
  const keywordStats = SearchHooks.useFilterKeywordStats(projectId, sdocIds);
  return (
    <>
      {keywordStats.isSuccess ? (
        <KeywordStatsWithData keywordStats={keywordStats.data} {...props} />
      ) : keywordStats.isError ? (
        <TabPanel value="keywords" style={{ padding: 0 }}>
          Error: {keywordStats.error.message}
        </TabPanel>
      ) : keywordStats.isLoading && keywordStats.isFetching ? (
        <TabPanel value="keywords" style={{ padding: 0 }}>
          Loading...
        </TabPanel>
      ) : (
        <TabPanel value="keywords" style={{ padding: 0 }}>
          Something went wrong!
        </TabPanel>
      )}
    </>
  );
}

interface KeywordStatsContentProps {
  keywordStats: KeywordStat[];
  handleClick: (keyword: string) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

function KeywordStatsWithData({ keywordStats, handleClick, parentRef, filterBy }: KeywordStatsContentProps) {
  const filteredKeywordStats = useFilterStats(keywordStats, filterBy);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredKeywordStats.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...filteredKeywordStats.map((x) => x.global_count)), [filteredKeywordStats]);

  return (
    <TabPanel
      value="keywords"
      style={{
        whiteSpace: "nowrap",
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
        padding: 0,
      }}
    >
      {filteredKeywordStats.length === 0 && <i>empty</i>}
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const keywordStat = filteredKeywordStats[virtualItem.index];
        return (
          <StatsDisplayButton
            key={virtualItem.key}
            term={keywordStat.keyword}
            count={keywordStat.filtered_count}
            totalCount={keywordStat.global_count}
            maxCount={maxValue}
            translateY={virtualItem.start}
            handleClick={() => handleClick(keywordStat.keyword)}
          />
        );
      })}
    </TabPanel>
  );
}

export default KeywordStats;
