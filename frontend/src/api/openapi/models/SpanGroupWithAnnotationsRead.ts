/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpanAnnotationRead } from "./SpanAnnotationRead";
export type SpanGroupWithAnnotationsRead = {
  /**
   * Name of the SpanGroup
   */
  name: string;
  /**
   * ID of the SpanGroup
   */
  id: number;
  /**
   * User that created the SpanGroup
   */
  user_id: number;
  /**
   * SourceDocument the SpanGroup refers to
   */
  sdoc_id: number;
  /**
   * Created timestamp of the SpanGroup
   */
  created: string;
  /**
   * Updated timestamp of the SpanGroup
   */
  updated: string;
  /**
   * Annotations of the SpanGroup
   */
  span_annotations: Array<SpanAnnotationRead>;
};
