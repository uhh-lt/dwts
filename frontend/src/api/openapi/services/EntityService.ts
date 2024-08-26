/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EntityMerge } from "../models/EntityMerge";
import type { EntityRead } from "../models/EntityRead";
import type { EntityRelease } from "../models/EntityRelease";
import type { EntityUpdate } from "../models/EntityUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class EntityService {
  /**
   * Updates the Entity with the given ID.
   * @returns EntityRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    entityId,
    requestBody,
  }: {
    entityId: number;
    requestBody: EntityUpdate;
  }): CancelablePromise<EntityRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/entity/{entity_id}",
      path: {
        entity_id: entityId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Merges entities and/or span texts with given IDs.
   * @returns EntityRead Successful Response
   * @throws ApiError
   */
  public static mergeEntities({ requestBody }: { requestBody: EntityMerge }): CancelablePromise<EntityRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/entity/merge",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Releases entities and/or span texts with given IDs.
   * @returns EntityRead Successful Response
   * @throws ApiError
   */
  public static releaseEntities({ requestBody }: { requestBody: EntityRelease }): CancelablePromise<Array<EntityRead>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/entity/release",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
