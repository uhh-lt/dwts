/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EntityMerge = {
  /**
   * Whether the link was created by a human
   */
  is_human?: boolean | null;
  /**
   * Link to wikidata
   */
  knowledge_base_id?: string | null;
  /**
   * Name of the Entity
   */
  name: string;
  /**
   * Id of the current Project
   */
  project_id: number;
  /**
   * List of Span Text IDs to merge
   */
  spantext_ids: Array<number>;
};
