/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeRead } from "../models/CodeRead";
import type { MemoCreate } from "../models/MemoCreate";
import type { MemoRead } from "../models/MemoRead";
import type { SpanAnnotationCreateWithCodeId } from "../models/SpanAnnotationCreateWithCodeId";
import type { SpanAnnotationRead } from "../models/SpanAnnotationRead";
import type { SpanAnnotationReadResolved } from "../models/SpanAnnotationReadResolved";
import type { SpanAnnotationUpdateWithCodeId } from "../models/SpanAnnotationUpdateWithCodeId";
import type { SpanGroupRead } from "../models/SpanGroupRead";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class SpanAnnotationService {
  /**
   * Creates a SpanAnnotation
   * Creates a SpanAnnotation
   * @returns any Successful Response
   * @throws ApiError
   */
  public static addSpanAnnotation({
    requestBody,
    resolve = true,
  }: {
    requestBody: SpanAnnotationCreateWithCodeId;
    /**
     * If true, the current_code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<SpanAnnotationRead | SpanAnnotationReadResolved> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/span",
      query: {
        resolve: resolve,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the SpanAnnotation
   * Returns the SpanAnnotation with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getById({
    spanId,
    resolve = true,
  }: {
    spanId: number;
    /**
     * If true, the current_code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<SpanAnnotationRead | SpanAnnotationReadResolved> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/{span_id}",
      path: {
        span_id: spanId,
      },
      query: {
        resolve: resolve,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Deletes the SpanAnnotation
   * Deletes the SpanAnnotation with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static deleteById({
    spanId,
  }: {
    spanId: number;
  }): CancelablePromise<SpanAnnotationRead | SpanAnnotationReadResolved> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/span/{span_id}",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Updates the SpanAnnotation
   * Updates the SpanAnnotation with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static updateById({
    spanId,
    requestBody,
    resolve = true,
  }: {
    spanId: number;
    requestBody: SpanAnnotationUpdateWithCodeId;
    /**
     * If true, the current_code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<SpanAnnotationRead | SpanAnnotationReadResolved> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/span/{span_id}",
      path: {
        span_id: spanId,
      },
      query: {
        resolve: resolve,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the Code of the SpanAnnotation
   * Returns the Code of the SpanAnnotation with the given ID if it exists.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getCode({ spanId }: { spanId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/{span_id}/code",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all SpanGroups that contain the the SpanAnnotation
   * Returns all SpanGroups that contain the the SpanAnnotation.
   * @returns SpanGroupRead Successful Response
   * @throws ApiError
   */
  public static getAllGroups({ spanId }: { spanId: number }): CancelablePromise<Array<SpanGroupRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/{span_id}/groups",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes the SpanAnnotation from all SpanGroups
   * Removes the SpanAnnotation from all SpanGroups
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static removeFromAllGroups({ spanId }: { spanId: number }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/span/{span_id}/groups",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes the SpanAnnotation from the SpanGroup
   * Removes the SpanAnnotation from the SpanGroup
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static removeFromGroup({
    spanId,
    groupId,
  }: {
    spanId: number;
    groupId: number;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/span/{span_id}/group/{group_id}",
      path: {
        span_id: spanId,
        group_id: groupId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Adds the SpanAnnotation to the SpanGroup
   * Adds the SpanAnnotation to the SpanGroup
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addToGroup({
    spanId,
    groupId,
  }: {
    spanId: number;
    groupId: number;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/span/{span_id}/group/{group_id}",
      path: {
        span_id: spanId,
        group_id: groupId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the Memo attached to the SpanAnnotation
   * Returns the Memo attached to the SpanAnnotation with the given ID if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getMemos({ spanId }: { spanId: number }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/{span_id}/memo",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Adds a Memo to the SpanAnnotation
   * Adds a Memo to the SpanAnnotation with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static addMemo({
    spanId,
    requestBody,
  }: {
    spanId: number;
    requestBody: MemoCreate;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/span/{span_id}/memo",
      path: {
        span_id: spanId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the Memos attached to the SpanAnnotation of the User with the given ID
   * Returns the Memos attached to the SpanAnnotation with the given ID of the User with the given ID if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getUserMemos({
    spanId,
    userId,
  }: {
    spanId: number;
    userId: number;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/{span_id}/memo/{user_id}",
      path: {
        span_id: spanId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
