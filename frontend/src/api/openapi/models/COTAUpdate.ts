/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { COTAConcept } from "./COTAConcept";

export type COTAUpdate = {
  /**
   * Name of the ConceptOverTimeAnalysis
   */
  name: string;
  /**
   * Description of the ConceptOverTimeAnalysis
   */
  description: string;
  /**
   * List of Concepts that are part of the ConceptOverTimeAnalysis
   */
  concepts: Array<COTAConcept>;
};
