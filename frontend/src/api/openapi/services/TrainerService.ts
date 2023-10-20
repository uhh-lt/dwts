/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TrainerJobParameters } from "../models/TrainerJobParameters";
import type { TrainerJobRead } from "../models/TrainerJobRead";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class TrainerService {
  /**
   * Starts a TrainerJob
   * Starts a TrainerJob with the given parameters
   * @returns TrainerJobRead Successful Response
   * @throws ApiError
   */
  public static startTrainerJob({
    requestBody,
  }: {
    requestBody: TrainerJobParameters;
  }): CancelablePromise<TrainerJobRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/trainer/",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Uses a model from a TrainerJob
   * Uses a model from a TrainerJob with the given parameter
   * @returns number Successful Response
   * @throws ApiError
   */
  public static useTrainerModel({ trainerJobId }: { trainerJobId: string }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/trainer/use/{trainer_job_id}",
      path: {
        trainer_job_id: trainerJobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the TrainerJob for the given ID
   * Returns the TrainerJob for the given ID if it exists
   * @returns TrainerJobRead Successful Response
   * @throws ApiError
   */
  public static getTrainerJob({ trainerJobId }: { trainerJobId: string }): CancelablePromise<TrainerJobRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/trainer/{trainer_job_id}",
      path: {
        trainer_job_id: trainerJobId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all TrainerJobs for the given project ID
   * Returns all TrainerJobs for the given project ID if it exists
   * @returns TrainerJobRead Successful Response
   * @throws ApiError
   */
  public static getAllTrainerJobs({ projectId }: { projectId: number }): CancelablePromise<Array<TrainerJobRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/trainer/project/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
