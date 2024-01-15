/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { COTAConcept } from "./COTAConcept";
import type { COTASentence } from "./COTASentence";
import type { COTASettings } from "./COTASettings";

export type COTAUpdate = {
  /**
   * Name of the ConceptOverTimeAnalysis
   */
  name?: string | null;
  /**
   * Settings of the ConceptOverTimeAnalysis.
   */
  settings?: COTASettings | null;
  /**
   * List of Concepts that are part of the ConceptOverTimeAnalysis
   */
  concepts?: Array<COTAConcept> | null;
  /**
   * List of Sentences that form the search space of the ConceptOverTimeAnalysis
   */
  search_space?: Array<COTASentence> | null;
};
