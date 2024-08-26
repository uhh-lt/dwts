/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpanTextRead } from "./SpanTextRead";
export type EntityRead = {
  /**
   * Whether the link was created by a human
   */
  is_human?: boolean | null;
  /**
   * Link to wikidata
   */
  knowledge_base_id?: string | null;
  /**
   * ID of the Entity
   */
  id: number;
  /**
   * Name of the Entity
   */
  name: string;
  /**
   * Project the Entity belongs to
   */
  project_id: number;
  /**
   * Created timestamp of the Entity
   */
  created: string;
  /**
   * Updated timestamp of the Entity
   */
  updated: string;
  /**
   * The SpanTexts belonging to this entity
   */
  span_texts?: Array<SpanTextRead>;
};
