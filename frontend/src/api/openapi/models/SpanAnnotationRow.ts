/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeRead } from "./CodeRead";
import type { MemoRead } from "./MemoRead";
import type { SourceDocumentRead } from "./SourceDocumentRead";
export type SpanAnnotationRow = {
  /**
   * ID of the SpanAnnotation
   */
  id: number;
  /**
   * The SpanText the SpanAnnotation spans.
   */
  span_text: string;
  /**
   * Code the SpanAnnotation refers to
   */
  code: CodeRead;
  /**
   * User the SpanAnnotation belongs to
   */
  user_id: number;
  /**
   * SourceDocument the SpanAnnotation refers to
   */
  sdoc: SourceDocumentRead;
  /**
   * The DocumentTagIDs of the SourceDocument.
   */
  tag_ids: Array<number>;
  /**
   * The Memo of the Annotation.
   */
  memo: MemoRead | null;
};
