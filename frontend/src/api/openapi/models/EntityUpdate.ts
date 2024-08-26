/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EntityUpdate = {
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
   * Span Text Ids which belong to this Entity
   */
  span_text_ids: Array<number>;
};
