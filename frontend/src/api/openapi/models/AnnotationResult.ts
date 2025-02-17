/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { SpanAnnotationRead } from "./SpanAnnotationRead";
export type AnnotationResult = {
  /**
   * Status of the Result
   */
  status: BackgroundJobStatus;
  /**
   * Status message of the result
   */
  status_message: string;
  /**
   * ID of the source document
   */
  sdoc_id: number;
  /**
   * Suggested annotations
   */
  suggested_annotations: Array<SpanAnnotationRead>;
};
