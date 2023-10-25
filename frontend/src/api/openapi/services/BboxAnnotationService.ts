/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationCreateWithCodeId } from "../models/BBoxAnnotationCreateWithCodeId";
import type { BBoxAnnotationRead } from "../models/BBoxAnnotationRead";
import type { BBoxAnnotationReadResolvedCode } from "../models/BBoxAnnotationReadResolvedCode";
import type { BBoxAnnotationUpdateWithCodeId } from "../models/BBoxAnnotationUpdateWithCodeId";
import type { CodeRead } from "../models/CodeRead";
import type { MemoCreate } from "../models/MemoCreate";
import type { MemoRead } from "../models/MemoRead";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class BboxAnnotationService {
  /**
   * Creates a BBoxAnnotation
   * Creates a BBoxAnnotation
   * @returns any Successful Response
   * @throws ApiError
   */
  public static addBboxAnnotation({
    requestBody,
    resolve = true,
  }: {
    requestBody: BBoxAnnotationCreateWithCodeId;
    /**
     * If true, the current_code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<BBoxAnnotationRead | BBoxAnnotationReadResolvedCode> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/bbox",
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
   * Returns the BBoxAnnotation
   * Returns the BBoxAnnotation with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getById({
    bboxId,
    resolve = true,
  }: {
    bboxId: number;
    /**
     * If true, the current_code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<BBoxAnnotationRead | BBoxAnnotationReadResolvedCode> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bbox/{bbox_id}",
      path: {
        bbox_id: bboxId,
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
   * Deletes the BBoxAnnotation
   * Deletes the BBoxAnnotation with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static deleteById({
    bboxId,
  }: {
    bboxId: number;
  }): CancelablePromise<BBoxAnnotationRead | BBoxAnnotationReadResolvedCode> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/bbox/{bbox_id}",
      path: {
        bbox_id: bboxId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Updates the BBoxAnnotation
   * Updates the BBoxAnnotation with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static updateById({
    bboxId,
    requestBody,
    resolve = true,
  }: {
    bboxId: number;
    requestBody: BBoxAnnotationUpdateWithCodeId;
    /**
     * If true, the current_code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<BBoxAnnotationRead | BBoxAnnotationReadResolvedCode> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/bbox/{bbox_id}",
      path: {
        bbox_id: bboxId,
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
   * Returns the Code of the BBoxAnnotation
   * Returns the Code of the BBoxAnnotation with the given ID if it exists.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getCode({ bboxId }: { bboxId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bbox/{bbox_id}/code",
      path: {
        bbox_id: bboxId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the Memo attached to the BBoxAnnotation
   * Returns the Memo attached to the BBoxAnnotation with the given ID if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getMemos({ bboxId }: { bboxId: number }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bbox/{bbox_id}/memo",
      path: {
        bbox_id: bboxId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Adds a Memo to the BBoxAnnotation
   * Adds a Memo to the BBoxAnnotation with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static addMemo({
    bboxId,
    requestBody,
  }: {
    bboxId: number;
    requestBody: MemoCreate;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/bbox/{bbox_id}/memo",
      path: {
        bbox_id: bboxId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the Memos attached to the BBoxAnnotation of the User with the given ID
   * Returns the Memos attached to the BBoxAnnotation with the given ID of the User with the given ID if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getUserMemos({
    bboxId,
    userId,
  }: {
    bboxId: number;
    userId: number;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bbox/{bbox_id}/memo/{user_id}",
      path: {
        bbox_id: bboxId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
