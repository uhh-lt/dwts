/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MLJobParameters } from "../models/MLJobParameters";
import type { MLJobRead } from "../models/MLJobRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class MlService {
  /**
   * Returns the MLJob for the given Parameters
   * @returns MLJobRead Successful Response
   * @throws ApiError
   */
  public static startMlJob({ requestBody }: { requestBody: MLJobParameters }): CancelablePromise<MLJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/ml",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the MLJob for the given ID if it exists
   * @returns MLJobRead Successful Response
   * @throws ApiError
   */
  public static getMlJob({ mlJobId }: { mlJobId: string }): CancelablePromise<MLJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/ml/{ml_job_id}",
      path: {
        ml_job_id: mlJobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all MLJobRead for the given project ID if it exists
   * @returns MLJobRead Successful Response
   * @throws ApiError
   */
  public static getAllLmJobs({ projectId }: { projectId: number }): CancelablePromise<Array<MLJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/ml/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
