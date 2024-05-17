import { Square } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import { Box, CircularProgress, Divider, Stack, TextField, ToggleButton } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import { BBoxAnnotationReadResolvedCode } from "../../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import { useDebounce } from "../../../utils/useDebounce.ts";
import { AnnotationCardProps } from "./AnnotationCardProps.ts";

type AnnotationReadResolved = SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode;

interface AnnotationExplorerProps<T extends AnnotationReadResolved> {
  annotations: T[] | undefined;
  filterByText: (text: string) => (annotation: T) => boolean; // this has to be a useCallback / constant function!
  renderAnnotationCard: (props: AnnotationCardProps<T>) => JSX.Element;
}

function AnnotationExplorer<T extends AnnotationReadResolved>({
  annotations,
  filterByText,
  renderAnnotationCard,
}: AnnotationExplorerProps<T>) {
  // text filtering
  const [filterValue, setFilterValue] = useState("");
  const filter = useDebounce(filterValue, 300);

  // code filtering
  const codes = useMemo(
    () =>
      annotations?.reduce(
        (acc, annotation) => {
          acc[annotation.code.id] = annotation.code;
          return acc;
        },
        {} as Record<number, CodeRead>,
      ) || {},
    [annotations],
  );
  const [filterCodeIds, setFilterCodeIds] = useState<number[]>([]);
  const toggleFilterCodeId = (codeId: number) => {
    if (filterCodeIds.includes(codeId)) {
      setFilterCodeIds(filterCodeIds.filter((id) => id !== codeId));
    } else {
      setFilterCodeIds([...filterCodeIds, codeId]);
    }
  };

  // filtering
  const filteredAnnotations = useMemo(() => {
    const filteredAnnotations = annotations?.filter(filterByText(filter)) || [];
    if (filterCodeIds.length > 0) {
      return filteredAnnotations.filter((annotation) => filterCodeIds.includes(annotation.code.id));
    }
    return filteredAnnotations;
  }, [annotations, filter, filterCodeIds, filterByText]);

  // annotation selection
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<number | undefined>(undefined);
  const toggleSelectedAnnotationId = (annotationId: number) => {
    if (selectedAnnotationId === annotationId) {
      setSelectedAnnotationId(undefined);
    } else {
      setSelectedAnnotationId(annotationId);
    }
  };

  // virtualization
  const listRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  const virtualizer = useVirtualizer({
    count: filteredAnnotations.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 95,
  });

  return (
    <Box className="myFlexContainer h100">
      <Stack direction="row" alignItems="center" spacing={2} pl={2} pr={1}>
        <SearchIcon sx={{ color: "dimgray" }} />
        <TextField
          sx={{ "& fieldset": { border: "none" }, input: { color: "dimgray", paddingY: "12px" } }}
          fullWidth
          placeholder="Search..."
          variant="outlined"
          value={filterValue}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterValue(event.target.value);
          }}
        />
      </Stack>
      <Divider />
      <Box className="myFlexFillAllContainer" ref={listRef} p={1}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {annotations ? (
            <>
              {annotations.length > 0
                ? filteredAnnotations.length > 0
                  ? virtualizer.getVirtualItems().map((virtualItem) => {
                      const annotation = filteredAnnotations[virtualItem.index];
                      const isSelected = selectedAnnotationId === annotation.id;
                      return (
                        <div
                          key={virtualItem.key}
                          ref={virtualizer.measureElement}
                          data-index={virtualItem.index}
                          style={{
                            width: "100%",
                            position: "absolute",
                            top: 0,
                            left: 0,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          {renderAnnotationCard({
                            annotation,
                            cardProps: {
                              variant: isSelected ? "elevation" : "outlined",
                              sx: { mb: 1 },
                              ...(isSelected && {
                                elevation: 8,
                              }),
                            },
                            onClick: () => toggleSelectedAnnotationId(annotation.id),
                          })}
                        </div>
                      );
                    })
                  : "No annotations found."
                : "Create an annotation to see it in the sidebar."}
            </>
          ) : (
            <CircularProgress />
          )}
        </div>
      </Box>
      <Divider />
      <Box alignItems="center" p={1}>
        {Object.values(codes).map((code) => {
          const isSelected = filterCodeIds.includes(code.id);
          return (
            <ToggleButton
              color="primary"
              key={code.id}
              value={code.id}
              selected={isSelected}
              onChange={() => {
                toggleFilterCodeId(code.id);
              }}
              sx={{ p: 0, m: 0.5 }}
            >
              <Square style={{ color: code.color }} fontSize={isSelected ? "medium" : "small"} />
            </ToggleButton>
          );
        })}
      </Box>
    </Box>
  );
}

export default AnnotationExplorer;
