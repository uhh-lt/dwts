/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { DateGroupBy } from "./DateGroupBy";

export type COTATimelineSettings = {
  /**
   * Group by date
   */
  group_by?: DateGroupBy;
  /**
   * ID of the Project Date Metadata that is used for the ConceptOverTimeAnalysis
   */
  date_metadata_id?: number | null;
  /**
   * Threshold of the ConceptOverTimeAnalysis
   */
  threshold?: number;
};
