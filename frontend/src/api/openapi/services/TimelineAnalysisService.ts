/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ColumnInfo_TimelineAnalysisColumns_ } from "../models/ColumnInfo_TimelineAnalysisColumns_";
import type { DateGroupBy } from "../models/DateGroupBy";
import type { Filter_TimelineAnalysisColumns__Input } from "../models/Filter_TimelineAnalysisColumns__Input";
import type { TimelineAnalysisCreate } from "../models/TimelineAnalysisCreate";
import type { TimelineAnalysisRead } from "../models/TimelineAnalysisRead";
import type { TimelineAnalysisResult } from "../models/TimelineAnalysisResult";
import type { TimelineAnalysisUpdate } from "../models/TimelineAnalysisUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class TimelineAnalysisService {
  /**
   * Creates an TimelineAnalysis
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static create({
    requestBody,
  }: {
    requestBody: TimelineAnalysisCreate;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/timelineAnalysis",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static getById({
    timelineAnalysisId,
  }: {
    timelineAnalysisId: number;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/timelineAnalysis/{timeline_analysis_id}",
      path: {
        timeline_analysis_id: timelineAnalysisId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    timelineAnalysisId,
    requestBody,
  }: {
    timelineAnalysisId: number;
    requestBody: TimelineAnalysisUpdate;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/timelineAnalysis/{timeline_analysis_id}",
      path: {
        timeline_analysis_id: timelineAnalysisId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static deleteById({
    timelineAnalysisId,
  }: {
    timelineAnalysisId: number;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/timelineAnalysis/{timeline_analysis_id}",
      path: {
        timeline_analysis_id: timelineAnalysisId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the TimelineAnalysis of the Project with the given ID and the User with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static getByProjectAndUser({
    projectId,
    userId,
  }: {
    projectId: number;
    userId: number;
  }): CancelablePromise<Array<TimelineAnalysisRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/timelineAnalysis/project/{project_id}/user/{user_id}",
      path: {
        project_id: projectId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Duplicates the TimelineAnalysis with the given ID if it exists
   * @returns TimelineAnalysisRead Successful Response
   * @throws ApiError
   */
  public static duplicateById({
    timelineAnalysisId,
  }: {
    timelineAnalysisId: number;
  }): CancelablePromise<TimelineAnalysisRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/timelineAnalysis/duplicate/{timeline_analysis_id}",
      path: {
        timeline_analysis_id: timelineAnalysisId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns TimelineAnalysis Info.
   * @returns ColumnInfo_TimelineAnalysisColumns_ Successful Response
   * @throws ApiError
   */
  public static info({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_TimelineAnalysisColumns_>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/timelineAnalysis/info/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Perform new timeline analysis.
   * @returns TimelineAnalysisResult Successful Response
   * @throws ApiError
   */
  public static doAnalysis({
    projectId,
    groupBy,
    projectMetadataId,
    requestBody,
  }: {
    projectId: number;
    groupBy: DateGroupBy;
    projectMetadataId: number;
    requestBody: Filter_TimelineAnalysisColumns__Input;
  }): CancelablePromise<Array<TimelineAnalysisResult>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/timelineAnalysis/do_analysis",
      query: {
        project_id: projectId,
        group_by: groupBy,
        project_metadata_id: projectMetadataId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
