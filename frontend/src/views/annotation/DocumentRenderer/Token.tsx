import { range } from "lodash";
import { useMemo } from "react";
import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { TagStyle } from "../annoSlice.ts";
import CodeIndicator from "./CodeIndicator.tsx";
import { IToken } from "./IToken.ts";
import Mark from "./Mark.tsx";

interface TokenProps {
  spanAnnotations: SpanAnnotationRead[];
  token: IToken;
}

function Token({ token, spanAnnotations }: TokenProps) {
  // global client state (redux)
  const selectedAnnotationId = useAppSelector((state) => state.annotations.selectedAnnotationId);
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);
  const tagStyle = useAppSelector((state) => state.annotations.tagStyle);

  // computed
  const spans = useMemo(
    () => spanAnnotations.filter((span) => hiddenCodeIds.indexOf(span.code_id) === -1),
    [spanAnnotations, hiddenCodeIds],
  );
  const marks = useMemo(() => {
    const markCount = spans.length;
    const h = 100 / markCount + "%";
    const isStart = spans.every((annotation) => annotation.begin_token === token.index);
    const isEnd = spans.every((annotation) => annotation.end_token === token.index + 1);
    return spans.map((spanAnnotation, index) => (
      <Mark
        key={spanAnnotation.id}
        codeId={spanAnnotation.code_id}
        isStart={isStart}
        isEnd={isEnd}
        height={h}
        top={(100 / markCount) * index + "%"}
      />
    ));
  }, [token, spans]);

  const codeIndicator = useMemo(() => {
    const startingSpans = spans.filter((spanAnnotation) => spanAnnotation.begin_token === token.index);

    return startingSpans.length > 0 && tagStyle !== TagStyle.None ? (
      <span className={`spangroup ${tagStyle}`}>
        {startingSpans.map((spanAnnotation) => (
          <CodeIndicator
            key={spanAnnotation.id}
            codeId={spanAnnotation.code_id}
            annotationId={spanAnnotation.id}
            isSelected={selectedAnnotationId === spanAnnotation.id}
            groups={spanAnnotation.group_ids}
          />
        ))}{" "}
      </span>
    ) : null;
  }, [tagStyle, token, spans, selectedAnnotationId]);

  return (
    <>
      <span className={`tok ${spans.map((s) => `span-${s.id}`).join(" ")}`} data-tokenid={token.index}>
        {codeIndicator}
        <span id={"token" + token.index} className={"text"}>
          {token.text}
        </span>
        {token.whitespace && " "}
        {marks}
      </span>
      {token.newLine > 0 && range(token.newLine).map((i) => <br key={i}></br>)}
    </>
  );
}

export default Token;
