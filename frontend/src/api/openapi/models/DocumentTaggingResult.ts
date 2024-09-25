/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DocumentTaggingResult = {
  /**
   * ID of the source document
   */
  sdoc_id: number;
  /**
   * IDs of the tags currently assigned to the document
   */
  current_tag_ids: Array<number>;
  /**
   * IDs of the tags suggested by the LLM to assign to the document
   */
  suggested_tag_ids: Array<number>;
  /**
   * Reasoning for the tagging
   */
  reasoning: string;
};
