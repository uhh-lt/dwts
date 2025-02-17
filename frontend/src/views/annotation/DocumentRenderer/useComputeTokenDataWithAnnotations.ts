import { useMemo } from "react";
import { SourceDocumentDataRead } from "../../../api/openapi/models/SourceDocumentDataRead.ts";
import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead.ts";
import { IToken } from "./IToken.ts";

function useComputeTokenDataWithAnnotations({
  sdocData,
  annotations,
}: {
  sdocData: SourceDocumentDataRead;
  annotations: SpanAnnotationRead[];
}) {
  // computed
  // todo: maybe implement with selector?
  const tokenData: IToken[] | undefined = useMemo(() => {
    const offsets = sdocData.token_character_offsets;
    const texts = sdocData.tokens;
    const result = texts.map((text, index) => ({
      beginChar: offsets[index][0],
      endChar: offsets[index][1],
      index,
      text,
      whitespace: offsets.length > index + 1 && offsets[index + 1][0] - offsets[index][1] > 0,
      newLine: text.split("\n").length - 1,
    }));
    return result;
  }, [sdocData]);

  // todo: maybe implement with selector?
  // this map stores annotationId -> SpanAnnotationRead
  const annotationMap = useMemo(() => {
    const result = new Map<number, SpanAnnotationRead>();
    annotations.forEach((a) => result.set(a.id, a));
    return result;
  }, [annotations]);

  // this map stores tokenId -> spanAnnotationId[]
  const annotationsPerToken = useMemo(() => {
    const result = new Map<number, number[]>();
    annotations.forEach((annotation) => {
      for (let i = annotation.begin_token; i <= annotation.end_token - 1; i++) {
        const tokenAnnotations = result.get(i) || [];
        tokenAnnotations.push(annotation.id);
        result.set(i, tokenAnnotations);
      }
    });
    return result;
  }, [annotations]);

  return { tokenData, annotationsPerToken, annotationMap };
}

export default useComputeTokenDataWithAnnotations;
