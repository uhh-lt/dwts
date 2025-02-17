import { useMemo } from "react";
import { SentenceAnnotationRead } from "../../../../api/openapi/models/SentenceAnnotationRead.ts";
import { SentenceAnnotatorResult } from "../../../../api/openapi/models/SentenceAnnotatorResult.ts";

export type SentAnnoMap = Record<number, SentenceAnnotationRead>;

export function useComputeSentAnnoMap(
  annotatorResult: SentenceAnnotatorResult | undefined,
  sentenceId: number,
): SentAnnoMap {
  return useMemo(() => {
    if (!annotatorResult) return { sentAnnoId2sentAnnoMap: {} };
    return annotatorResult.sentence_annotations[sentenceId].reduce((acc, anno) => {
      acc[anno.id] = anno;
      return acc;
    }, {} as SentAnnoMap);
  }, [annotatorResult, sentenceId]);
}
