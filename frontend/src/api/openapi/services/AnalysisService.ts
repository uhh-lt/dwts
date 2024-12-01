/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationSearchResult } from "../models/BBoxAnnotationSearchResult";
import type { Body_analysis_bbox_annotation_search } from "../models/Body_analysis_bbox_annotation_search";
import type { Body_analysis_code_frequencies } from "../models/Body_analysis_code_frequencies";
import type { Body_analysis_sentence_annotation_search } from "../models/Body_analysis_sentence_annotation_search";
import type { Body_analysis_span_annotation_search } from "../models/Body_analysis_span_annotation_search";
import type { Body_analysis_word_frequency_analysis } from "../models/Body_analysis_word_frequency_analysis";
import type { Body_analysis_word_frequency_analysis_export } from "../models/Body_analysis_word_frequency_analysis_export";
import type { CodeFrequency } from "../models/CodeFrequency";
import type { CodeOccurrence } from "../models/CodeOccurrence";
import type { ColumnInfo_BBoxColumns_ } from "../models/ColumnInfo_BBoxColumns_";
import type { ColumnInfo_SentAnnoColumns_ } from "../models/ColumnInfo_SentAnnoColumns_";
import type { ColumnInfo_SpanColumns_ } from "../models/ColumnInfo_SpanColumns_";
import type { ColumnInfo_WordFrequencyColumns_ } from "../models/ColumnInfo_WordFrequencyColumns_";
import type { PointDTO } from "../models/PointDTO";
import type { SampledSdocsResults } from "../models/SampledSdocsResults";
import type { SentenceAnnotationSearchResult } from "../models/SentenceAnnotationSearchResult";
import type { SpanAnnotationSearchResult } from "../models/SpanAnnotationSearchResult";
import type { WordFrequencyResult } from "../models/WordFrequencyResult";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AnalysisService {
  /**
   * Returns all SourceDocument IDs that match the query parameters.
   * @returns CodeFrequency Successful Response
   * @throws ApiError
   */
  public static codeFrequencies({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Body_analysis_code_frequencies;
  }): CancelablePromise<Array<CodeFrequency>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/code_frequencies",
      query: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SourceDocument IDs that match the query parameters.
   * @returns CodeOccurrence Successful Response
   * @throws ApiError
   */
  public static codeOccurrences({
    projectId,
    codeId,
    requestBody,
  }: {
    projectId: number;
    codeId: number;
    requestBody: Array<number>;
  }): CancelablePromise<Array<CodeOccurrence>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/code_occurrences",
      query: {
        project_id: projectId,
        code_id: codeId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SpanAnnotationSearch Info.
   * @returns ColumnInfo_SpanColumns_ Successful Response
   * @throws ApiError
   */
  public static spanAnnotationSearchInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SpanColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/span_annotation_search_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SpanAnnotationSearch.
   * @returns SpanAnnotationSearchResult Successful Response
   * @throws ApiError
   */
  public static spanAnnotationSearch({
    projectId,
    requestBody,
    page,
    pageSize,
  }: {
    projectId: number;
    requestBody: Body_analysis_span_annotation_search;
    page?: number | null;
    pageSize?: number | null;
  }): CancelablePromise<SpanAnnotationSearchResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/span_annotation_search",
      query: {
        project_id: projectId,
        page: page,
        page_size: pageSize,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SentenceAnnotationSearch Info.
   * @returns ColumnInfo_SentAnnoColumns_ Successful Response
   * @throws ApiError
   */
  public static sentenceAnnotationSearchInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SentAnnoColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/sentence_annotation_search_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns Sentence Annotations.
   * @returns SentenceAnnotationSearchResult Successful Response
   * @throws ApiError
   */
  public static sentenceAnnotationSearch({
    projectId,
    requestBody,
    page,
    pageSize,
  }: {
    projectId: number;
    requestBody: Body_analysis_sentence_annotation_search;
    page?: number | null;
    pageSize?: number | null;
  }): CancelablePromise<SentenceAnnotationSearchResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/sentence_annotation_search",
      query: {
        project_id: projectId,
        page: page,
        page_size: pageSize,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns BBoxAnnotationSearch Info.
   * @returns ColumnInfo_BBoxColumns_ Successful Response
   * @throws ApiError
   */
  public static bboxAnnotationSearchInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_BBoxColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/bbox_annotation_search_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns BBoxAnnotationSearchResult.
   * @returns BBoxAnnotationSearchResult Successful Response
   * @throws ApiError
   */
  public static bboxAnnotationSearch({
    projectId,
    requestBody,
    page,
    pageSize,
  }: {
    projectId: number;
    requestBody: Body_analysis_bbox_annotation_search;
    page?: number | null;
    pageSize?: number | null;
  }): CancelablePromise<BBoxAnnotationSearchResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/bbox_annotation_search",
      query: {
        project_id: projectId,
        page: page,
        page_size: pageSize,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns Tuple[num_sdocs_with_date_metadata, num_total_sdocs].
   * @returns any[] Successful Response
   * @throws ApiError
   */
  public static countSdocsWithDateMetadata({
    projectId,
    dateMetadataId,
  }: {
    projectId: number;
    dateMetadataId: number;
  }): CancelablePromise<any[]> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/analysis/count_sdocs_with_date_metadata/{project_id}/metadata/{date_metadata_id}}",
      path: {
        project_id: projectId,
        date_metadata_id: dateMetadataId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns WordFrequency Info.
   * @returns ColumnInfo_WordFrequencyColumns_ Successful Response
   * @throws ApiError
   */
  public static wordFrequencyAnalysisInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_WordFrequencyColumns_>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/analysis/word_frequency_analysis_info/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Perform word frequency analysis.
   * @returns WordFrequencyResult Successful Response
   * @throws ApiError
   */
  public static wordFrequencyAnalysis({
    projectId,
    page,
    pageSize,
    requestBody,
  }: {
    projectId: number;
    page: number;
    pageSize: number;
    requestBody: Body_analysis_word_frequency_analysis;
  }): CancelablePromise<WordFrequencyResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/word_frequency_analysis",
      query: {
        project_id: projectId,
        page: page,
        page_size: pageSize,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Export the word frequency analysis.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static wordFrequencyAnalysisExport({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Body_analysis_word_frequency_analysis_export;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/word_frequency_analysis_export",
      query: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Sample & Aggregate Source Documents by tags.
   * @returns SampledSdocsResults Successful Response
   * @throws ApiError
   */
  public static sampleSdocsByTags({
    projectId,
    n,
    frac,
    requestBody,
  }: {
    projectId: number;
    n: number;
    frac: number;
    requestBody: Array<Array<number>>;
  }): CancelablePromise<Array<SampledSdocsResults>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/sample_sdocs_by_tags",
      query: {
        project_id: projectId,
        n: n,
        frac: frac,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Hello World!
   * @returns any Successful Response
   * @throws ApiError
   */
  public static myNewAnalysisFeature(): CancelablePromise<Array<Record<string, any>>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/my_new_analysis",
    });
  }
  /**
   * Returns the top words for 30 topics. This is still mock-data
   * @returns any Successful Response
   * @throws ApiError
   */
  public static returnTopWordsData(): CancelablePromise<Array<Record<string, any>>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/top_words_data",
    });
  }
  /**
   * Hello World!
   * @returns PointDTO Successful Response
   * @throws ApiError
   */
  public static dto(): CancelablePromise<Array<PointDTO>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/random_walk_dto",
    });
  }
}
