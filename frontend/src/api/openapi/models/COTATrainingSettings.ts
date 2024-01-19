/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { DimensionalityReductionAlgorithm } from "./DimensionalityReductionAlgorithm";

export type COTATrainingSettings = {
  /**
   * Number of sentences to use as search space per concept.
   */
  search_space_topk: number;
  /**
   * Threshold to filter sentences from the search space.
   */
  search_space_threshold: number;
  /**
   * Minimum number of annotations per concept required to train the CEM.
   */
  min_required_annotations_per_concept: number;
  /**
   * Dimensionality Reduction Algorithm used for the ConceptOverTimeAnalysis
   */
  dimensionality_reduction_algorithm: DimensionalityReductionAlgorithm;
  /**
   * Number of layers of the CEM.
   */
  layers: number;
  /**
   * Number of dimensions of the CEM.
   */
  dimensions: number;
  /**
   * Number of epochs to train
   */
  epochs: number;
};
