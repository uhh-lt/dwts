import { difference, intersection } from "lodash";
import { useMemo } from "react";
import { SentenceAnnotatorResult } from "../../../api/openapi/models/SentenceAnnotatorResult.ts";
import SentenceAnnotationHooks from "../../../api/SentenceAnnotationHooks.ts";

export interface UseGetSentenceAnnotator {
  annotatorResult: SentenceAnnotatorResult | undefined;
  annotationPositions: Record<number, number>[];
  numPositions: number;
}

export function useGetSentenceAnnotator({
  sdocId,
  userId,
}: {
  sdocId: number;
  userId: number | undefined;
}): UseGetSentenceAnnotator {
  const annotatorResult = SentenceAnnotationHooks.useGetSentenceAnnotator(sdocId, userId);
  const { annotationPositions, numPositions } = useMemo(() => {
    if (!annotatorResult.data?.sentence_annotations) return { annotationPositions: [], numPositions: 0 };
    const sentenceAnnotations = Object.values(annotatorResult.data.sentence_annotations);

    if (sentenceAnnotations.length === 0) return { annotationPositions: [], numPositions: 0 };

    // map from annotation id to position
    const annotationPositions: Record<number, number>[] = [
      sentenceAnnotations[0].reduce(
        (acc, sentAnno) => {
          acc[sentAnno.id] = Object.keys(acc).length;
          return acc;
        },
        {} as Record<number, number>,
      ),
    ];
    let numPositions = sentenceAnnotations[0].length;

    for (let i = 1; i < sentenceAnnotations.length; i++) {
      const annotations = sentenceAnnotations[i];
      const prevAnnotationPositions = annotationPositions[i - 1];

      const prevAnnotations = Object.keys(prevAnnotationPositions).map((id) => parseInt(id));
      const currentAnnotations = annotations.map((sentAnno) => sentAnno.id);

      const sameAnnotations = intersection(prevAnnotations, currentAnnotations);
      const newAnnotations = difference(currentAnnotations, prevAnnotations);

      const annotationPosition: Record<number, number> = {};
      const occupiedPositions: number[] = [];

      // fill with positions of same annotations
      for (const annoId of sameAnnotations) {
        annotationPosition[annoId] = prevAnnotationPositions[annoId];
        occupiedPositions.push(prevAnnotationPositions[annoId]);
      }

      // fill with positions of new annotations
      for (const annoId of newAnnotations) {
        const maxPosition = Math.max(0, ...occupiedPositions);
        const allPositions = Array.from({ length: maxPosition + 2 }, (_, i) => i);
        const availablePositions = difference(allPositions, occupiedPositions);

        annotationPosition[annoId] = Math.min(...availablePositions);
        occupiedPositions.push(annotationPosition[annoId]);

        if (annotationPosition[annoId] > numPositions) {
          numPositions = annotationPosition[annoId];
        }
      }

      annotationPositions.push(annotationPosition);
    }

    // flip keys and values of annotationPositions (key: position, value: annotation id)
    const flippedAnnotationPositions = annotationPositions.map((positions) => {
      const flipped: Record<number, number> = {};
      for (const [annoId, position] of Object.entries(positions)) {
        flipped[position] = parseInt(annoId);
      }
      return flipped;
    });

    return { annotationPositions: flippedAnnotationPositions, numPositions };
  }, [annotatorResult.data?.sentence_annotations]);

  return { annotatorResult: annotatorResult.data, annotationPositions, numPositions };
}
