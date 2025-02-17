/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeRead } from "./CodeRead";
import type { MemoRead } from "./MemoRead";
import type { SourceDocumentRead } from "./SourceDocumentRead";
export type SentenceAnnotationRow = {
  /**
   * ID of the SentenceAnnotation
   */
  id: number;
  /**
   * The Text the SentenceAnnotation spans.
   */
  text: string;
  /**
   * Code the SentenceAnnotation refers to
   */
  code: CodeRead;
  /**
   * User the SentenceAnnotation belongs to
   */
  user_id: number;
  /**
   * SourceDocument the SentenceAnnotation refers to
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
