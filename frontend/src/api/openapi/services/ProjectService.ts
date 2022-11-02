/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_project_upload_project_sdoc } from "../models/Body_project_upload_project_sdoc";
import type { CodeRead } from "../models/CodeRead";
import type { DocumentTagRead } from "../models/DocumentTagRead";
import type { MemoCreate } from "../models/MemoCreate";
import type { MemoRead } from "../models/MemoRead";
import type { PaginatedSourceDocumentReads } from "../models/PaginatedSourceDocumentReads";
import type { ProjectCreate } from "../models/ProjectCreate";
import type { ProjectRead } from "../models/ProjectRead";
import type { ProjectUpdate } from "../models/ProjectUpdate";
import type { UserRead } from "../models/UserRead";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class ProjectService {
  /**
   * Returns all Projects of the current user
   * Returns all Projects of the current user
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static readAll({
    skip,
    limit,
  }: {
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
  }): CancelablePromise<Array<ProjectRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project",
      query: {
        skip: skip,
        limit: limit,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Creates a new Project
   * Creates a new Project.
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static createNewProject({ requestBody }: { requestBody: ProjectCreate }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/project",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the Project with the given ID
   * Returns the Project with the given ID if it exists
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static readProject({ projId }: { projId: number }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes the Project
   * Removes the Project with the given ID.
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static deleteProject({ projId }: { projId: number }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/project/{proj_id}",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Updates the Project
   * Updates the Project with the given ID.
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static updateProject({
    projId,
    requestBody,
  }: {
    projId: number;
    requestBody: ProjectUpdate;
  }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/project/{proj_id}",
      path: {
        proj_id: projId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all SourceDocuments of the Project.
   * Returns all SourceDocuments of the Project with the given ID.
   * @returns PaginatedSourceDocumentReads Successful Response
   * @throws ApiError
   */
  public static getProjectSdocs({
    projId,
    onlyFinished = true,
    skip,
    limit,
  }: {
    projId: number;
    onlyFinished?: boolean;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
  }): CancelablePromise<PaginatedSourceDocumentReads> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/sdoc",
      path: {
        proj_id: projId,
      },
      query: {
        only_finished: onlyFinished,
        skip: skip,
        limit: limit,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Uploads one or multiple SourceDocument to the Project
   * Uploads one or multiple SourceDocument to the Project with the given ID if it exists
   * @returns string Successful Response
   * @throws ApiError
   */
  public static uploadProjectSdoc({
    projId,
    formData,
  }: {
    projId: number;
    formData: Body_project_upload_project_sdoc;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/project/{proj_id}/sdoc",
      path: {
        proj_id: projId,
      },
      formData: formData,
      mediaType: "multipart/form-data",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes all SourceDocuments of the Project
   * Removes all SourceDocuments of the Project with the given ID if it exists
   * @returns number Successful Response
   * @throws ApiError
   */
  public static deleteProjectSdocs({ projId }: { projId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/project/{proj_id}/sdoc",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Dissociates the Users with the Project
   * Dissociates the Users with the Project with the given ID if it exists
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static dissociateUserFromProject({
    projId,
    userId,
  }: {
    projId: number;
    userId: number;
  }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/project/{proj_id}/user/{user_id}",
      path: {
        proj_id: projId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Associates the User with the Project
   * Associates an existing User to the Project with the given ID if it exists
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static associateUserToProject({
    projId,
    userId,
  }: {
    projId: number;
    userId: number;
  }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/project/{proj_id}/user/{user_id}",
      path: {
        proj_id: projId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all Users of the Project
   * Returns all Users of the Project with the given ID
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static getProjectUsers({ projId }: { projId: number }): CancelablePromise<Array<UserRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/user",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all Codes of the Project
   * Returns all Codes of the Project with the given ID
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getProjectCodes({ projId }: { projId: number }): CancelablePromise<Array<CodeRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/code",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes all Codes of the Project
   * Removes all Codes of the Project with the given ID if it exists
   * @returns number Successful Response
   * @throws ApiError
   */
  public static deleteProjectCodes({ projId }: { projId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/project/{proj_id}/code",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all DocumentTags of the Project
   * Returns all DocumentTags of the Project with the given ID
   * @returns DocumentTagRead Successful Response
   * @throws ApiError
   */
  public static getProjectTags({ projId }: { projId: number }): CancelablePromise<Array<DocumentTagRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/tag",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes all DocumentTags of the Project
   * Removes all DocumentTags of the Project with the given ID if it exists
   * @returns number Successful Response
   * @throws ApiError
   */
  public static deleteProjectTags({ projId }: { projId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/project/{proj_id}/tag",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all Codes of the Project from a User
   * Returns all Codes of the Project from a User
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getUserCodesOfProject({
    projId,
    userId,
  }: {
    projId: number;
    userId: number;
  }): CancelablePromise<Array<CodeRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/user/{user_id}/code",
      path: {
        proj_id: projId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes all Codes of the Project from a User
   * Removes all Codes of the Project from a User. Returns the number of removed Codes.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static removeUserCodesOfProject({
    projId,
    userId,
  }: {
    projId: number;
    userId: number;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/project/{proj_id}/user/{user_id}/code",
      path: {
        proj_id: projId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all Memos of the Project from a User
   * Returns all Memos of the Project from a User
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getUserMemosOfProject({
    projId,
    userId,
    onlyStarred = false,
  }: {
    projId: number;
    userId: number;
    /**
     * If true only starred Memos are returned
     */
    onlyStarred?: boolean;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/user/{user_id}/memo",
      path: {
        proj_id: projId,
        user_id: userId,
      },
      query: {
        only_starred: onlyStarred,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes all Memos of the Project from a User
   * Removes all Memos of the Project from a User. Returns the number of removed Memos.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static removeUserMemosOfProject({
    projId,
    userId,
  }: {
    projId: number;
    userId: number;
  }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/project/{proj_id}/user/{user_id}/memo",
      path: {
        proj_id: projId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the Memo of the current User for the Project.
   * Returns the Memo of the current User for the Project with the given ID.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getMemos({ projId }: { projId: number }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/memo",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Adds a Memo of the current User to the Project.
   * Adds a Memo of the current User to the Project with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static addMemo({
    projId,
    requestBody,
  }: {
    projId: number;
    requestBody: MemoCreate;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/project/{proj_id}/memo",
      path: {
        proj_id: projId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the Memo attached to the Project of the User with the given ID
   * Returns the Memo attached to the Project with the given ID of the User with the given ID if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getUserMemo({ projId, userId }: { projId: number; userId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/memo/{user_id}",
      path: {
        proj_id: projId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
