import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ClearIcon from "@mui/icons-material/Clear";
import SquareIcon from "@mui/icons-material/Square";
import { Box, IconButton, ListItemButton, Stack, Tooltip } from "@mui/material";
import { useMemo } from "react";
import { CodeMap } from "../../../../api/CodeHooks.ts";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { SentenceAnnotationRead } from "../../../../api/openapi/models/SentenceAnnotationRead.ts";
import ColorUtils from "../../../../utils/ColorUtils.ts";
import { UseGetSentenceAnnotator } from "../useGetSentenceAnnotator.ts";
import { isAnnotationSame } from "./comparisonUtils.ts";
import { SentAnnoMap, useComputeSentAnnoMap } from "./useComputeSentAnnoMap.ts";

interface DocumentSentenceProps {
  sentenceId: number;
  isSelected: boolean;
  selectedCode: CodeRead | undefined;
  hoveredSentAnnoId: number | null;
  hoveredCodeId: number | undefined;
  sentence: string;
  onAnnotationClick: (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    sentenceAnnotation: SentenceAnnotationRead,
  ) => void;
  onAnnotationMouseEnter: (sentAnnoId: number) => void;
  onAnnotationMouseLeave: (sentAnnoId: number) => void;
  onSentenceMouseDown: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  onSentenceMouseEnter: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  onApplyAnnotation: (annotation: SentenceAnnotationRead) => void;
  onRevertAnnotation: (annotation: SentenceAnnotationRead) => void;
  numSentenceDigits: number;
  annotatorLeft: UseGetSentenceAnnotator;
  annotatorRight: UseGetSentenceAnnotator;
  isAnnotationAllowedLeft: boolean;
  isAnnotationAllowedRight: boolean;
  codeMap: CodeMap;
}

function DocumentSentence({
  sentenceId,
  isSelected,
  selectedCode,
  hoveredSentAnnoId,
  hoveredCodeId,
  sentence,
  onAnnotationClick,
  onAnnotationMouseEnter,
  onAnnotationMouseLeave,
  onSentenceMouseEnter,
  onSentenceMouseDown,
  onApplyAnnotation,
  onRevertAnnotation,
  numSentenceDigits,
  annotatorLeft,
  annotatorRight,
  isAnnotationAllowedLeft,
  isAnnotationAllowedRight,
  codeMap,
}: DocumentSentenceProps) {
  const leftSentAnnoMap = useComputeSentAnnoMap(annotatorLeft.annotatorResult, sentenceId);
  const rightSentAnnoMap = useComputeSentAnnoMap(annotatorRight.annotatorResult, sentenceId);

  return (
    <Stack direction="row" width="100%">
      <DocumentSentencePart
        sentenceId={sentenceId}
        isSelected={isAnnotationAllowedLeft && isSelected}
        selectedCode={selectedCode}
        hoveredSentAnnoId={hoveredSentAnnoId}
        hoveredCodeId={hoveredCodeId}
        sentence={sentence}
        onAnnotationClick={onAnnotationClick}
        onAnnotationMouseEnter={onAnnotationMouseEnter}
        onAnnotationMouseLeave={onAnnotationMouseLeave}
        onSentenceMouseDown={isAnnotationAllowedLeft ? onSentenceMouseDown : undefined}
        onSentenceMouseEnter={isAnnotationAllowedLeft ? onSentenceMouseEnter : undefined}
        numSentenceDigits={numSentenceDigits}
        annotator={annotatorLeft}
        sentAnnoMap={leftSentAnnoMap}
        codeMap={codeMap}
      />

      {(isAnnotationAllowedLeft || isAnnotationAllowedRight) && (
        <AnnotationApplyPart
          isDirectionLeft={isAnnotationAllowedLeft}
          sentenceId={sentenceId}
          annotatorLeftMap={leftSentAnnoMap}
          annotatorLeft={annotatorLeft}
          annotatorRightMap={rightSentAnnoMap}
          annotatorRight={annotatorRight}
          onApplyAnnotation={onApplyAnnotation}
          onRevertAnnotation={onRevertAnnotation}
          onAnnotationMouseEnter={onAnnotationMouseEnter}
          onAnnotationMouseLeave={onAnnotationMouseLeave}
          codeMap={codeMap}
        />
      )}

      <DocumentSentencePart
        sentenceId={sentenceId}
        isSelected={isAnnotationAllowedRight && isSelected}
        selectedCode={selectedCode}
        hoveredSentAnnoId={hoveredSentAnnoId}
        hoveredCodeId={hoveredCodeId}
        sentence={sentence}
        onAnnotationClick={onAnnotationClick}
        onAnnotationMouseEnter={onAnnotationMouseEnter}
        onAnnotationMouseLeave={onAnnotationMouseLeave}
        onSentenceMouseDown={isAnnotationAllowedRight ? onSentenceMouseDown : undefined}
        onSentenceMouseEnter={isAnnotationAllowedRight ? onSentenceMouseEnter : undefined}
        numSentenceDigits={numSentenceDigits}
        annotator={annotatorRight}
        sentAnnoMap={rightSentAnnoMap}
        codeMap={codeMap}
      />
    </Stack>
  );
}

interface DocumentSentencePartProps {
  sentenceId: number;
  isSelected: boolean;
  selectedCode: CodeRead | undefined;
  hoveredSentAnnoId: number | null;
  hoveredCodeId: number | undefined;
  sentence: string;
  onAnnotationClick: (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    sentenceAnnotation: SentenceAnnotationRead,
  ) => void;
  onAnnotationMouseEnter: (sentAnnoId: number) => void;
  onAnnotationMouseLeave: (sentAnnoId: number) => void;
  onSentenceMouseDown?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  onSentenceMouseEnter?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, sentenceId: number) => void;
  numSentenceDigits: number;
  annotator: UseGetSentenceAnnotator;
  sentAnnoMap: SentAnnoMap;
  codeMap: CodeMap;
}

function DocumentSentencePart({
  sentenceId,
  isSelected,
  selectedCode,
  hoveredSentAnnoId,
  hoveredCodeId,
  sentence,
  onAnnotationClick,
  onAnnotationMouseEnter,
  onAnnotationMouseLeave,
  onSentenceMouseEnter,
  onSentenceMouseDown,
  numSentenceDigits,
  annotator,
  sentAnnoMap,
  codeMap,
}: DocumentSentencePartProps) {
  const sentAnnoCodeIds = useMemo(() => Object.values(sentAnnoMap).map((anno) => anno.code_id), [sentAnnoMap]);

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
  }, [isSelected, hoveredSentAnnoId, hoveredCodeId, sentAnnoCodeIds, selectedCode?.color, sentAnnoMap, codeMap]);

  return (
    <>
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
        style={{ flexGrow: 1 }}
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
      {Array.from({ length: annotator.numPositions + 1 }, (_, i) => i).map((annoPosition) => {
        let annoId: number | null = null;
        if (annotator.annotationPositions[sentenceId]) {
          annoId = annotator.annotationPositions[sentenceId][annoPosition] || null;
        }
        const key = `${sentenceId}-${annoPosition}`;
        if (annoId) {
          const annotation = sentAnnoMap[annoId];
          const code = codeMap[annotation.code_id];
          const isStartOfAnnotation = sentenceId === annotation.sentence_id_start;
          const isEndOfAnnotation = sentenceId === annotation.sentence_id_end;
          return (
            <Tooltip key={key} title={code.name} placement="top">
              <div
                onClick={(event) => onAnnotationClick(event, annotation)}
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
    </>
  );
}

interface AnnotationApplyPartProps {
  isDirectionLeft: boolean;
  sentenceId: number;
  annotatorLeftMap: SentAnnoMap;
  annotatorLeft: UseGetSentenceAnnotator;
  annotatorRightMap: SentAnnoMap;
  annotatorRight: UseGetSentenceAnnotator;
  onApplyAnnotation: (annotation: SentenceAnnotationRead) => void;
  onRevertAnnotation: (annotation: SentenceAnnotationRead) => void;
  onAnnotationMouseEnter: (sentAnnoId: number) => void;
  onAnnotationMouseLeave: (sentAnnoId: number) => void;
  codeMap: CodeMap;
}

function AnnotationApplyPart({
  isDirectionLeft,
  sentenceId,
  annotatorLeftMap,
  annotatorLeft,
  annotatorRight,
  annotatorRightMap,
  onApplyAnnotation,
  onRevertAnnotation,
  onAnnotationMouseEnter,
  onAnnotationMouseLeave,
  codeMap,
}: AnnotationApplyPartProps) {
  return (
    <>
      <div
        style={{
          paddingRight: "8px",
          borderRight: "1px solid #e8eaed",
        }}
      />
      <div
        style={{
          flexShrink: 0,
          width: 164,
          alignSelf: "center",
        }}
      >
        {isDirectionLeft
          ? Array.from({ length: annotatorRight.numPositions + 1 }, (_, i) => i).map((annoPosition) => {
              const leftAnnotations = annotatorLeft.annotatorResult?.sentence_annotations[sentenceId] || [];
              let annoId: number | null = null;
              if (annotatorRight.annotationPositions[sentenceId]) {
                annoId = annotatorRight.annotationPositions[sentenceId][annoPosition] || null;
              }
              const key = `${sentenceId}-${annoPosition}`;
              if (annoId) {
                const annotation = annotatorRightMap[annoId];
                const code = codeMap[annotation.code_id];
                const isStartOfAnnotation = sentenceId === annotation.sentence_id_start;
                const sameAnnotation = leftAnnotations.find((leftAnno) => isAnnotationSame(annotation, leftAnno));
                if (isStartOfAnnotation) {
                  return (
                    <Box
                      key={key}
                      onMouseEnter={() => onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)}
                      onMouseLeave={() => onAnnotationMouseLeave(sameAnnotation ? sameAnnotation.id : annotation.id)}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="center">
                        <IconButton
                          sx={{ p: 0.5, ml: -0.5 }}
                          disabled={!!sameAnnotation}
                          onClick={() => onApplyAnnotation(annotation)}
                          onMouseEnter={() =>
                            onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)
                          }
                        >
                          <ArrowBackIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          sx={{ p: 0.5 }}
                          disabled={!sameAnnotation}
                          onClick={() => onRevertAnnotation(sameAnnotation!)}
                          onMouseEnter={() =>
                            onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)
                          }
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                        <SquareIcon style={{ color: code.color }} fontSize="small" />
                      </Stack>
                    </Box>
                  );
                }
                return <div key={key} />;
              }
              return <div key={key} />;
            })
          : Array.from({ length: annotatorLeft.numPositions + 1 }, (_, i) => i).map((annoPosition) => {
              const rightAnnotations = annotatorRight.annotatorResult?.sentence_annotations[sentenceId] || [];
              let annoId: number | null = null;
              if (annotatorLeft.annotationPositions[sentenceId]) {
                annoId = annotatorLeft.annotationPositions[sentenceId][annoPosition] || null;
              }
              const key = `${sentenceId}-${annoPosition}`;
              if (annoId) {
                const annotation = annotatorLeftMap[annoId];
                const code = codeMap[annotation.code_id];
                const isStartOfAnnotation = sentenceId === annotation.sentence_id_start;
                const sameAnnotation = rightAnnotations.find((rightAnno) => isAnnotationSame(annotation, rightAnno));
                if (isStartOfAnnotation) {
                  return (
                    <Box
                      key={key}
                      onMouseEnter={() => onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)}
                      onMouseLeave={() => onAnnotationMouseLeave(sameAnnotation ? sameAnnotation.id : annotation.id)}
                    >
                      <Stack key={key} direction="row" alignItems="center" justifyContent="center">
                        <SquareIcon style={{ color: code.color }} fontSize="small" />
                        <IconButton
                          sx={{ p: 0.5 }}
                          disabled={!sameAnnotation}
                          onClick={() => onRevertAnnotation(sameAnnotation!)}
                          onMouseEnter={() =>
                            onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)
                          }
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          sx={{ p: 0.5, ml: -0.5 }}
                          disabled={!!sameAnnotation}
                          onClick={() => onApplyAnnotation(annotation)}
                          onMouseEnter={() =>
                            onAnnotationMouseEnter(sameAnnotation ? sameAnnotation.id : annotation.id)
                          }
                        >
                          <ArrowForwardIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  );
                }
                return <div key={key} />;
              }
              return <div key={key} />;
            })}
      </div>
    </>
  );
}

export default DocumentSentence;
