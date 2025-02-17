import { TabPanel } from "@mui/lab";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useMemo } from "react";
import SearchHooks from "../../../api/SearchStatisticsHooks.ts";
import TagHooks from "../../../api/TagHooks.ts";
import { TagStat } from "../../../api/openapi/models/TagStat.ts";
import StatsDisplayButton, { StatsDisplayButtonProps } from "./StatsDisplayButton.tsx";
import { useFilterStats } from "./useFilterStats.ts";

interface DocumentTagStatsProps {
  currentTab: string;
  projectId: number;
  sdocIds?: number[];
  handleClick: (tagId: number) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  filterBy: string;
}

function DocumentTagStats(props: DocumentTagStatsProps) {
  if (props.currentTab !== `tags`) {
    return null;
  } else {
    return <DocumentTagStatsContent {...props} />;
  }
}

function DocumentTagStatsContent({ ...props }: DocumentTagStatsProps) {
  const tagStats = SearchHooks.useFilterTagStats(props.sdocIds);
  return (
    <>
      {tagStats.isSuccess ? (
        <DocumentTagStatsWithData tagStats={tagStats.data} {...props} />
      ) : tagStats.isError ? (
        <TabPanel value="tags" style={{ padding: 0 }}>
          Error: {tagStats.error.message}
        </TabPanel>
      ) : tagStats.isLoading && tagStats.isFetching ? (
        <TabPanel value="tags" style={{ padding: 0 }}>
          Loading...
        </TabPanel>
      ) : (
        <TabPanel value="tags" style={{ padding: 0 }}>
          Something went wrong!
        </TabPanel>
      )}
    </>
  );
}

export default DocumentTagStats;

function DocumentTagStatsWithData({
  tagStats,
  handleClick,
  parentRef,
  filterBy,
}: DocumentTagStatsProps & { tagStats: TagStat[] }) {
  const filteredTagStats = useFilterStats(tagStats, filterBy);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: filteredTagStats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  });

  // computed
  const maxValue = useMemo(() => Math.max(...filteredTagStats.map((t) => t.global_count)), [filteredTagStats]);

  return (
    <TabPanel
      value="tags"
      style={{
        whiteSpace: "nowrap",
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
        padding: 0,
      }}
    >
      {filteredTagStats.length === 0 && <i>empty</i>}
      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
        const tagStat = filteredTagStats[virtualItem.index];
        return (
          <DocumentTagStatButtonContent
            tagId={tagStat.tag.id}
            key={virtualItem.key}
            count={tagStat.filtered_count}
            totalCount={tagStat.global_count}
            maxCount={maxValue}
            translateY={virtualItem.start}
            handleClick={() => handleClick(tagStat.tag.id)}
          />
        );
      })}
    </TabPanel>
  );
}

function DocumentTagStatButtonContent({
  tagId,
  ...props
}: { tagId: number } & Omit<StatsDisplayButtonProps, "term" | "disabled">) {
  const tag = TagHooks.useGetTag(tagId);

  return (
    <StatsDisplayButton
      {...props}
      disabled={!tag.isSuccess}
      term={tag.isSuccess ? tag.data.name : tag.isLoading ? "Loading..." : tag.isError ? tag.error.message : "Error"}
    />
  );
}
