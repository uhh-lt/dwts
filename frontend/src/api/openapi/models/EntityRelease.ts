/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EntityRelease = {
  /**
   * Whether the link was created by a human
   */
  is_human?: boolean | null;
  /**
   * Link to wikidata
   */
  knowledge_base_id?: string | null;
  /**
   * Id of the current Project
   */
  project_id: number;
  /**
   * List of Span Text IDs to release
   */
  spantext_ids: Array<number>;
};
