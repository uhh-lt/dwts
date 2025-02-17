/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationCreate } from "../models/BBoxAnnotationCreate";
import type { BBoxAnnotationRead } from "../models/BBoxAnnotationRead";
import type { BBoxAnnotationUpdate } from "../models/BBoxAnnotationUpdate";
import type { CodeRead } from "../models/CodeRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class BboxAnnotationService {
  /**
   * Creates a BBoxAnnotation
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addBboxAnnotation({
    requestBody,
  }: {
    requestBody: BBoxAnnotationCreate;
  }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/bbox",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the BBoxAnnotation with the given ID.
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getById({ bboxId }: { bboxId: number }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "GET",
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
   * Updates the BBoxAnnotation with the given ID.
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    bboxId,
    requestBody,
  }: {
    bboxId: number;
    requestBody: BBoxAnnotationUpdate;
  }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/bbox/{bbox_id}",
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
   * Deletes the BBoxAnnotation with the given ID.
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ bboxId }: { bboxId: number }): CancelablePromise<BBoxAnnotationRead> {
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
   * Returns BBoxAnnotations with the given Code of the logged-in User
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getByUserCode({ codeId }: { codeId: number }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bbox/code/{code_id}/user",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
