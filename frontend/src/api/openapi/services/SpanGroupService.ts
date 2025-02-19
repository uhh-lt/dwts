/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SpanAnnotationRead } from "../models/SpanAnnotationRead";
import type { SpanGroupCreate } from "../models/SpanGroupCreate";
import type { SpanGroupRead } from "../models/SpanGroupRead";
import type { SpanGroupUpdate } from "../models/SpanGroupUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SpanGroupService {
  /**
   * Creates a new SpanGroup and returns it with the generated ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static createNewSpanGroup({
    requestBody,
  }: {
    requestBody: SpanGroupCreate;
  }): CancelablePromise<SpanGroupRead | null> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/spangroup",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SpanGroup with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getById({ spanGroupId }: { spanGroupId: number }): CancelablePromise<SpanGroupRead | null> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/spangroup/{span_group_id}",
      path: {
        span_group_id: spanGroupId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the SpanGroup with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static updateById({
    spanGroupId,
    requestBody,
  }: {
    spanGroupId: number;
    requestBody: SpanGroupUpdate;
  }): CancelablePromise<SpanGroupRead | null> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/spangroup/{span_group_id}",
      path: {
        span_group_id: spanGroupId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the SpanGroup with the given ID.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static deleteById({ spanGroupId }: { spanGroupId: number }): CancelablePromise<SpanGroupRead | null> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/spangroup/{span_group_id}",
      path: {
        span_group_id: spanGroupId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SpanAnnotations in the SpanGroup with the given ID if it exists
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getAnnotations({ spanGroupId }: { spanGroupId: number }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/spangroup/{span_group_id}/span_annotations",
      path: {
        span_group_id: spanGroupId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
