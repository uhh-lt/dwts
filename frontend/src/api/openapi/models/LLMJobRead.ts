/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { LLMJobParameters2_Output } from "./LLMJobParameters2_Output";
import type { LLMJobResult } from "./LLMJobResult";
export type LLMJobRead = {
  /**
   * Status of the LLMJob
   */
  status?: BackgroundJobStatus;
  /**
   * Number of total steps.
   */
  num_steps_total: number;
  /**
   * The current step.
   */
  current_step: number;
  /**
   * Description of the current step.
   */
  current_step_description: string;
  /**
   * Results of the LLMJob.
   */
  result?: LLMJobResult | null;
  /**
   * ID of the LLMJob
   */
  id: string;
  /**
   * The parameters of the LLMJob that defines what to llm!
   */
  parameters: LLMJobParameters2_Output;
  /**
   * Created timestamp of the LLMJob
   */
  created: string;
  /**
   * Updated timestamp of the LLMJob
   */
  updated: string;
};
