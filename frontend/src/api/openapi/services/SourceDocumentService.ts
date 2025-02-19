/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationRead } from "../models/BBoxAnnotationRead";
import type { SentenceAnnotatorResult } from "../models/SentenceAnnotatorResult";
import type { SourceDocumentDataRead } from "../models/SourceDocumentDataRead";
import type { SourceDocumentMetadataRead } from "../models/SourceDocumentMetadataRead";
import type { SourceDocumentRead } from "../models/SourceDocumentRead";
import type { SourceDocumentUpdate } from "../models/SourceDocumentUpdate";
import type { SpanAnnotationRead } from "../models/SpanAnnotationRead";
import type { SpanGroupRead } from "../models/SpanGroupRead";
import type { SpanGroupWithAnnotationsRead } from "../models/SpanGroupWithAnnotationsRead";
import type { WordFrequencyRead } from "../models/WordFrequencyRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SourceDocumentService {
  /**
   * Returns the SourceDocument with the given ID if it exists
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static getById({
    sdocId,
    onlyIfFinished = true,
  }: {
    sdocId: number;
    onlyIfFinished?: boolean;
  }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        only_if_finished: onlyIfFinished,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the SourceDocument with the given ID if it exists
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ sdocId }: { sdocId: number }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sdoc/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the SourceDocument with the given ID.
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static updateSdoc({
    sdocId,
    requestBody,
  }: {
    sdocId: number;
    requestBody: SourceDocumentUpdate;
  }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sdoc/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SourceDocumentData with the given ID if it exists
   * @returns SourceDocumentDataRead Successful Response
   * @throws ApiError
   */
  public static getByIdWithData({
    sdocId,
    onlyIfFinished = true,
  }: {
    sdocId: number;
    onlyIfFinished?: boolean;
  }): CancelablePromise<SourceDocumentDataRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/data/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        only_if_finished: onlyIfFinished,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the ids of SourceDocuments linked to the SourceDocument with the given id.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getLinkedSdocs({ sdocId }: { sdocId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/linked_sdocs",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the URL to the original file of the SourceDocument with the given ID if it exists.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static getFileUrl({
    sdocId,
    relative = true,
    webp = false,
    thumbnail = false,
  }: {
    sdocId: number;
    relative?: boolean;
    webp?: boolean;
    thumbnail?: boolean;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/url",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        relative: relative,
        webp: webp,
        thumbnail: thumbnail,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SourceDocumentMetadata of the SourceDocument with the given ID if it exists
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static getAllMetadata({ sdocId }: { sdocId: number }): CancelablePromise<Array<SourceDocumentMetadataRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/metadata",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SourceDocumentMetadata with the given Key if it exists.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static readMetadataByKey({
    sdocId,
    metadataKey,
  }: {
    sdocId: number;
    metadataKey: string;
  }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/metadata/{metadata_key}",
      path: {
        sdoc_id: sdocId,
        metadata_key: metadataKey,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns IDs of users that annotated that SourceDocument.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getAnnotators({ sdocId }: { sdocId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/annotators",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all DocumentTagIDs linked with the SourceDocument.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getAllTags({ sdocId }: { sdocId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/tags",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SourceDocument's word frequencies with the given ID if it exists
   * @returns WordFrequencyRead Successful Response
   * @throws ApiError
   */
  public static getWordFrequencies({ sdocId }: { sdocId: number }): CancelablePromise<Array<WordFrequencyRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/word_frequencies",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SpanAnnotations of the Users with the given ID if it exists
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getAllSpanAnnotationsBulk({
    sdocId,
    userId,
  }: {
    sdocId: number;
    userId: number;
  }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/span_annotations/{user_id}}",
      path: {
        sdoc_id: sdocId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SpanGroupWithAnnotations of the User in the sDoc
   * @returns SpanGroupWithAnnotationsRead Successful Response
   * @throws ApiError
   */
  public static getSdocGroupsWithAnnotations({
    userId,
    sdocId,
  }: {
    userId: number;
    sdocId: number;
  }): CancelablePromise<Array<SpanGroupWithAnnotationsRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc}/span_groups/{user_id}",
      path: {
        user_id: userId,
      },
      query: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all BBoxAnnotations of the Users with the given ID if it exists
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getAllBboxAnnotationsBulk({
    sdocId,
    userId,
    skip,
    limit,
  }: {
    sdocId: number;
    userId: number;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number | null;
    /**
     * The maximum number of returned elements
     */
    limit?: number | null;
  }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/bbox_annotations/{user_id}",
      path: {
        sdoc_id: sdocId,
        user_id: userId,
      },
      query: {
        skip: skip,
        limit: limit,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SentenceAnnotations of the User for the SourceDocument
   * @returns SentenceAnnotatorResult Successful Response
   * @throws ApiError
   */
  public static getSentenceAnnotator({
    sdocId,
    userId,
    skip,
    limit,
  }: {
    sdocId: number;
    userId: number;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number | null;
    /**
     * The maximum number of returned elements
     */
    limit?: number | null;
  }): CancelablePromise<SentenceAnnotatorResult> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/sentence_annotator",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        user_id: userId,
        skip: skip,
        limit: limit,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SpanGroups of the logged-in User if it exists
   * @returns SpanGroupRead Successful Response
   * @throws ApiError
   */
  public static getAllSpanGroups({
    sdocId,
    skip,
    limit,
  }: {
    sdocId: number;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number | null;
    /**
     * The maximum number of returned elements
     */
    limit?: number | null;
  }): CancelablePromise<Array<SpanGroupRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/user/span_groups",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        skip: skip,
        limit: limit,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
