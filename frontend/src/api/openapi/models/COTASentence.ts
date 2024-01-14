/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type COTASentence = {
  /**
   * ID of the Sentence in the SDoc
   */
  sentence_id: number;
  /**
   * ID of the Sentence Document that contains the Sentence
   */
  sdoc_id: number;
  /**
   * Dictionary of Concept IDs and their similarity score
   */
  concept_similarities: Record<string, number>;
  /**
   * Concept ID this sentence belongs to
   */
  concept_annotation: string | null;
  /**
   * X coordinate of the Sentence in the search space
   */
  x: number;
  /**
   * Y coordinate of the Sentence in the search space
   */
  y: number;
};
