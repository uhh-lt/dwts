import { ListItemButton, Stack, StackProps, Tooltip } from "@mui/material";
import { useMemo } from "react";
import { CodeMap } from "../../../../api/CodeHooks.ts";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { SentenceAnnotationRead } from "../../../../api/openapi/models/SentenceAnnotationRead.ts";
import ColorUtils from "../../../../utils/ColorUtils.ts";

interface DocumentSentenceProps {
  sentenceId: number;
  isSelected: boolean;
  selectedCode: CodeRead | undefined;
  selectedSentAnnoId: number | undefined;
  hoveredSentAnnoId: number | null;
  hoveredCodeId: number | undefined;
  sentence: string;
  sentenceAnnotations: SentenceAnnotationRead[];
  onAnnotationClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentAnnoId: number) => void;
  onAnnotationMouseEnter: (sentAnnoId: number) => void;
  onAnnotationMouseLeave: (sentAnnoId: number) => void;
  onSentenceMouseDown?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  onSentenceMouseEnter?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  numPositions: number;
  numSentenceDigits: number;
  annotationPositions: Record<number, number>;
  codeMap: CodeMap;
}

function DocumentSentence({
  sentenceId,
  isSelected,
  selectedCode,
  selectedSentAnnoId,
  hoveredSentAnnoId,
  hoveredCodeId,
  sentence,
  sentenceAnnotations,
  onAnnotationClick,
  onAnnotationMouseEnter,
  onAnnotationMouseLeave,
  onSentenceMouseEnter,
  onSentenceMouseDown,
  numPositions,
  annotationPositions,
  numSentenceDigits,
  codeMap,
  ...props
}: DocumentSentenceProps & StackProps) {
  const sentAnnoMap = useMemo(
    () =>
      sentenceAnnotations?.reduce(
        (acc, anno) => {
          acc[anno.id] = anno;
          return acc;
        },
        {} as Record<number, SentenceAnnotationRead>,
      ),
    [sentenceAnnotations],
  );
  const sentAnnoCodeIds = useMemo(() => sentenceAnnotations.map((anno) => anno.code_id), [sentenceAnnotations]);

  const highlightedColor = useMemo(() => {
    if (isSelected) {
      return selectedCode?.color || "rgb(255, 0, 0)";
    }
    if (hoveredSentAnnoId) {
      const sa = sentAnnoMap[hoveredSentAnnoId];
      return codeMap[sa?.code_id]?.color;
    }
    if (hoveredCodeId && sentAnnoCodeIds.includes(hoveredCodeId)) {
      return codeMap[hoveredCodeId]?.color;
    }
    if (selectedSentAnnoId && sentAnnoMap[selectedSentAnnoId]) {
      const sa = sentAnnoMap[selectedSentAnnoId];
      return codeMap[sa?.code_id]?.color;
    }
  }, [
    isSelected,
    hoveredSentAnnoId,
    hoveredCodeId,
    sentAnnoCodeIds,
    selectedSentAnnoId,
    sentAnnoMap,
    selectedCode?.color,
    codeMap,
  ]);

  return (
    <Stack direction="row" {...props}>
      <div
        style={{
          paddingRight: "8px",
          borderLeft: "1px solid #e8eaed",
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      />
      <div
        style={{
          flexShrink: 0,
          alignSelf: "stretch",
          paddingTop: "8px",
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      >
        {String(sentenceId + 1).padStart(numSentenceDigits, "0")}
      </div>
      <div
        style={{
          paddingRight: "8px",
          borderRight: "1px solid #e8eaed",
          backgroundColor: "rgba(0, 0, 0, 0.04)",
        }}
      />
      <ListItemButton
        onMouseDown={onSentenceMouseDown ? (event) => onSentenceMouseDown(event, sentenceId) : undefined}
        onMouseEnter={onSentenceMouseEnter ? (event) => onSentenceMouseEnter(event, sentenceId) : undefined}
        style={{ ...props.style, flexGrow: 1 }}
        data-sent-id={sentenceId}
        onFocus={(event) => {
          // prevent focus
          event.target.blur();
        }}
      >
        <div data-sent-id={sentenceId}>
          {highlightedColor ? (
            <mark
              data-sent-id={sentenceId}
              style={{
                margin: "0 -0.4em",
                padding: "0.18em 0.4em",
                borderRadius: "0.8em 0.3em",
                background: "transparent",
                backgroundImage: `linear-gradient(to right, ${ColorUtils.colorStringToRGBA(
                  highlightedColor,
                  1,
                )}, ${ColorUtils.colorStringToRGBA(highlightedColor, 0.7)} 4%, ${ColorUtils.colorStringToRGBA(
                  highlightedColor,
                  0.3,
                )})`,
                boxDecorationBreak: "clone",
              }}
            >
              {sentence}
            </mark>
          ) : (
            <>{sentence}</>
          )}
        </div>
      </ListItemButton>
      {Array.from({ length: numPositions + 1 }, (_, i) => i).map((annoPosition) => {
        const annoId = annotationPositions[annoPosition] || null;
        const key = `${sentenceId}-${annoPosition}`;
        if (annoId) {
          const annotation = sentAnnoMap[annoId];
          const code = codeMap[annotation.code_id];
          const isStartOfAnnotation = sentenceId === annotation.sentence_id_start;
          const isEndOfAnnotation = sentenceId === annotation.sentence_id_end;
          return (
            <Tooltip key={key} title={code.name} placement="top">
              <div
                onClick={(event) => onAnnotationClick(event, annoId)}
                onMouseEnter={() => onAnnotationMouseEnter(annoId)}
                onMouseLeave={() => onAnnotationMouseLeave(annoId)}
                style={{
                  flexShrink: 0,
                  cursor: "pointer",
                  paddingRight: "8px",
                  paddingTop: isStartOfAnnotation ? "4px" : undefined,
                  paddingBottom: isEndOfAnnotation ? "4px" : undefined,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderTopRightRadius: isStartOfAnnotation ? "8px" : undefined,
                    borderBottomRightRadius: isEndOfAnnotation ? "8px" : undefined,
                    borderTop: isStartOfAnnotation ? `4px solid ${code.color}` : undefined,
                    borderBottom: isEndOfAnnotation ? `4px solid ${code.color}` : undefined,
                    borderRight: `4px solid ${code.color}`,
                    paddingLeft: "8px",
                  }}
                />
              </div>
            </Tooltip>
          );
        }
        return <div key={key} style={{ flexShrink: 0, borderRight: "4px solid transparent", paddingLeft: "16px" }} />;
      })}
    </Stack>
  );
}

export default DocumentSentence;
