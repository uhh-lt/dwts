import { Card, CardContent, CardHeader } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useRef } from "react";
import { ActionRead } from "../../api/openapi";
import ActionCard from "./ActionCard";

interface ActionCardWeekViewProps {
  actions: ActionRead[];
  day: Date;
}

function ActionCardWeekView({ actions, day }: ActionCardWeekViewProps) {
  const dateHeader: string = day.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <Card variant="outlined" style={{ width: "100%", height: "100%", backgroundColor: "whitesmoke" }}>
      <CardHeader
        style={{ backgroundColor: "#1976d2", color: "white", padding: "8px" }}
        title={dateHeader}
        titleTypographyProps={{
          variant: "h6",
          style: {
            textAlign: "center",
          },
        }}
      />
      <ActionCardWeekViewContent actions={actions} />
    </Card>
  );
}

export default ActionCardWeekView;

interface ActionCardWeekViewContentProps {
  actions: ActionRead[];
}

function ActionCardWeekViewContent({ actions }: ActionCardWeekViewContentProps) {
  const listRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);

  // The virtualizer
  const virtualizer = useVirtualizer({
    count: actions.length || 0,
    getScrollElement: () => listRef.current,
    estimateSize: () => 155,
  });

  return (
    <CardContent ref={listRef} style={{ height: "94%", overflowY: "auto", padding: 0 }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            ref={virtualizer.measureElement}
            data-index={virtualItem.index}
            style={{
              width: "100%",
              padding: 5,
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ActionCard action={actions[virtualItem.index]} />
          </div>
        ))}
      </div>
    </CardContent>
  );
}
