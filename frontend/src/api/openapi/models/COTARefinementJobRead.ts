/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { COTARead } from "./COTARead";
import type { COTARefinementHyperparameters } from "./COTARefinementHyperparameters";

export type COTARefinementJobRead = {
  /**
   * Status of the BackgroundJob
   */
  status?: BackgroundJobStatus;
  /**
   * COTA that is used in the COTARefinementJob
   */
  cota: COTARead;
  /**
   * Hyperparameters of the COTARefinementJob
   */
  hyperparams: COTARefinementHyperparameters;
  /**
   * ID of the COTARefinementJob
   */
  id?: string;
  /**
   * Current Pipeline Step of the COTARefinementJob
   */
  current_pipeline_step?: string | null;
  /**
   * Optional ErrorMessage of the COTARefinementJob
   */
  error_message?: string | null;
  /**
   * Created timestamp of the COTARefinementJob
   */
  created: string;
  /**
   * Updated timestamp of the COTARefinementJob
   */
  updated: string;
};
