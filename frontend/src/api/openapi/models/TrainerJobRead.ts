/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { TrainerJobParameters } from "./TrainerJobParameters";

export type TrainerJobRead = {
  /**
   * Status of the TrainerJob
   */
  status?: BackgroundJobStatus;
  /**
   * ID of the TrainerJob
   */
  id: string;
  /**
   * The parameters of the TrainerJob that defines how to train!
   */
  parameters: TrainerJobParameters;
  /**
   * The path to the saved model.
   */
  saved_model_path?: string;
  /**
   * Created timestamp of the TrainerJob
   */
  created: string;
  /**
   * Updated timestamp of the TrainerJob
   */
  updated: string;
};
