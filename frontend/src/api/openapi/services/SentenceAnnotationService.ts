/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeRead } from "../models/CodeRead";
import type { SentenceAnnotationCreate } from "../models/SentenceAnnotationCreate";
import type { SentenceAnnotationRead } from "../models/SentenceAnnotationRead";
import type { SentenceAnnotationUpdate } from "../models/SentenceAnnotationUpdate";
import type { SentenceAnnotationUpdateBulk } from "../models/SentenceAnnotationUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SentenceAnnotationService {
  /**
   * Creates a SentenceAnnotation
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addSentenceAnnotation({
    requestBody,
  }: {
    requestBody: SentenceAnnotationCreate;
  }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/sentence",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates SentenceAnnotations in Bulk
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addSentenceAnnotationsBulk({
    requestBody,
  }: {
    requestBody: Array<SentenceAnnotationCreate>;
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/sentence/bulk/create",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SentenceAnnotation with the given ID.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getById({ sentenceAnnoId }: { sentenceAnnoId: number }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sentence/{sentence_anno_id}",
      path: {
        sentence_anno_id: sentenceAnnoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the SentenceAnnotation with the given ID.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    sentenceAnnoId,
    requestBody,
  }: {
    sentenceAnnoId: number;
    requestBody: SentenceAnnotationUpdate;
  }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sentence/{sentence_anno_id}",
      path: {
        sentence_anno_id: sentenceAnnoId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the SentenceAnnotation with the given ID.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ sentenceAnnoId }: { sentenceAnnoId: number }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sentence/{sentence_anno_id}",
      path: {
        sentence_anno_id: sentenceAnnoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates SentenceAnnotation in Bulk
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateSentAnnoAnnotationsBulk({
    requestBody,
  }: {
    requestBody: Array<SentenceAnnotationUpdateBulk>;
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sentence/bulk/update",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes all SentenceAnnotations with the given IDs.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteBulkById({
    requestBody,
  }: {
    requestBody: Array<number>;
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sentence/bulk/delete",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Code of the SentenceAnnotation with the given ID if it exists.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getCode({ sentenceAnnoId }: { sentenceAnnoId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sentence/{sentence_anno_id}/code",
      path: {
        sentence_anno_id: sentenceAnnoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SentenceAnnotations with the given Code of the logged-in User
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getByUserCode({ codeId }: { codeId: number }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sentence/code/{code_id}/user",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
