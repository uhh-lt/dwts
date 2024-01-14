/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { COTAConcept } from "./COTAConcept";

export type COTACreate = {
  /**
   * Name of the ConceptOverTimeAnalysis
   */
  name: string;
  /**
   * Project the ConceptOverTimeAnalysis belongs to
   */
  project_id: number;
  /**
   * User the ConceptOverTimeAnalysis belongs to
   */
  user_id: number;
  /**
   * List of Concepts that are part of the ConceptOverTimeAnalysis
   */
  concepts: Array<COTAConcept>;
};
