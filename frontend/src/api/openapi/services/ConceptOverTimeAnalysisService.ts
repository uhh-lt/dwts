/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { COTACreate } from "../models/COTACreate";
import type { COTARead } from "../models/COTARead";
import type { COTAUpdate } from "../models/COTAUpdate";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class ConceptOverTimeAnalysisService {
  /**
   * Creates an ConceptOverTimeAnalysis
   * Creates an ConceptOverTimeAnalysis
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static create({ requestBody }: { requestBody: COTACreate }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/cota",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the ConceptOverTimeAnalysis
   * Returns the ConceptOverTimeAnalysis with the given ID if it exists
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static getById({ cotaId }: { cotaId: number }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/cota/{cota_id}",
      path: {
        cota_id: cotaId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes the ConceptOverTimeAnalysis
   * Removes the ConceptOverTimeAnalysis with the given ID if it exists
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static deleteById({ cotaId }: { cotaId: number }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/cota/{cota_id}",
      path: {
        cota_id: cotaId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Updates the Analysis Table
   * Updates the Analysis Table with the given ID if it exists
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static updateById({
    cotaId,
    requestBody,
  }: {
    cotaId: number;
    requestBody: COTAUpdate;
  }): CancelablePromise<COTARead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/cota/{cota_id}",
      path: {
        cota_id: cotaId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns COTAs of the Project of the User
   * Returns the ConceptOverTimeAnalysis of the Project with the given ID and the User with the given ID if it exists
   * @returns COTARead Successful Response
   * @throws ApiError
   */
  public static getByProjectAndUser({
    projectId,
    userId,
  }: {
    projectId: number;
    userId: number;
  }): CancelablePromise<Array<COTARead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/cota/project/{project_id}/user/{user_id}",
      path: {
        project_id: projectId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
