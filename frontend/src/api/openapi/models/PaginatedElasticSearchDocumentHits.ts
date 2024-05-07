/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ElasticSearchDocumentHit } from "./ElasticSearchDocumentHit";
export type PaginatedElasticSearchDocumentHits = {
  /**
   * The IDs, scores and (optional) highlights of SourceDocument search results on the requested page.
   */
  hits: Array<ElasticSearchDocumentHit>;
  /**
   * The total number of hits. Used for pagination.
   */
  total_results: number;
};
