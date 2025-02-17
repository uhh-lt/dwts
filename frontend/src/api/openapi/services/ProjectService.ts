/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_project_upload_project_sdoc } from "../models/Body_project_upload_project_sdoc";
import type { CodeRead } from "../models/CodeRead";
import type { DocumentTagRead } from "../models/DocumentTagRead";
import type { MemoRead } from "../models/MemoRead";
import type { PreprocessingJobRead } from "../models/PreprocessingJobRead";
import type { ProjectAddUser } from "../models/ProjectAddUser";
import type { ProjectCreate } from "../models/ProjectCreate";
import type { ProjectMetadataRead } from "../models/ProjectMetadataRead";
import type { ProjectRead } from "../models/ProjectRead";
import type { ProjectUpdate } from "../models/ProjectUpdate";
import type { UserRead } from "../models/UserRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ProjectService {
  /**
   * Creates a new Project
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
   * Uploads one or multiple SourceDocument to the Project with the given ID if it exists
   * @returns PreprocessingJobRead Successful Response
   * @throws ApiError
   */
  public static uploadProjectSdoc({
    projId,
    formData,
  }: {
    projId: number;
    formData: Body_project_upload_project_sdoc;
  }): CancelablePromise<PreprocessingJobRead> {
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
   * Associates an existing User to the Project with the given ID if it exists
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static associateUserToProject({
    projId,
    requestBody,
  }: {
    projId: number;
    requestBody: ProjectAddUser;
  }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/project/{proj_id}/user",
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
   * Returns all Memos of the Project from the logged-in User
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getUserMemosOfProject({
    projId,
    onlyStarred,
  }: {
    projId: number;
    /**
     * If true only starred Memos are returned
     */
    onlyStarred?: boolean | null;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/user/memo",
      path: {
        proj_id: projId,
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
   * Gets or creates the Memo attached to the Project with the given ID of the logged-in User.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getOrCreateUserMemo({ projId }: { projId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/memo/user",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Id of the SourceDocument identified by project_id and filename if it exists
   * @returns number Successful Response
   * @throws ApiError
   */
  public static resolveFilename({
    projId,
    filename,
    onlyFinished = true,
  }: {
    projId: number;
    filename: string;
    onlyFinished?: boolean;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/resolve_filename/{filename}",
      path: {
        proj_id: projId,
        filename: filename,
      },
      query: {
        only_finished: onlyFinished,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all ProjectMetadata of the SourceDocument with the given ID if it exists
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static getAllMetadata({ projId }: { projId: number }): CancelablePromise<Array<ProjectMetadataRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/metadata",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns groups of duplicate sdoc ids.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static findDuplicateTextSdocs({
    projId,
    maxDifferentWords,
  }: {
    projId: number;
    maxDifferentWords: number;
  }): CancelablePromise<Array<Array<number>>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/project/{proj_id}/find_duplicate_text_sdocs",
      path: {
        proj_id: projId,
      },
      query: {
        max_different_words: maxDifferentWords,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
