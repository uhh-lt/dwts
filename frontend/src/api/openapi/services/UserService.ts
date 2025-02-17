/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProjectRead } from "../models/ProjectRead";
import type { PublicUserRead } from "../models/PublicUserRead";
import type { UserRead } from "../models/UserRead";
import type { UserUpdate } from "../models/UserUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class UserService {
  /**
   * Returns the current (logged in) user
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static getMe(): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/me",
    });
  }
  /**
   * Returns the User with the given ID if it exists
   * @returns PublicUserRead Successful Response
   * @throws ApiError
   */
  public static getById({ userId }: { userId: number }): CancelablePromise<PublicUserRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/by_id/{user_id}",
      path: {
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Users that exist in the system
   * @returns PublicUserRead Successful Response
   * @throws ApiError
   */
  public static getAll({
    skip,
    limit,
  }: {
    /**
     * The number of elements to skip (offset)
     */
    skip?: number | null;
    /**
     * The maximum number of returned elements
     */
    limit?: number | null;
  }): CancelablePromise<Array<PublicUserRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/all",
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
   * Removes the logged-in User
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static deleteMe(): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/user/",
    });
  }
  /**
   * Updates the logged-in User
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static updateMe({ requestBody }: { requestBody: UserUpdate }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/user/",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Projects of the logged-in User
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static getUserProjects(): CancelablePromise<Array<ProjectRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/project",
    });
  }
}
