/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeCreate } from "../models/CodeCreate";
import type { CodeRead } from "../models/CodeRead";
import type { CodeUpdate } from "../models/CodeUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class CodeService {
  /**
   * Creates a new Code and returns it with the generated ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static createNewCode({ requestBody }: { requestBody: CodeCreate }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/code",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Code with the given ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getById({ codeId }: { codeId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/{code_id}",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Code with the given ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    codeId,
    requestBody,
  }: {
    codeId: number;
    requestBody: CodeUpdate;
  }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/code/{code_id}",
      path: {
        code_id: codeId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the Code with the given ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ codeId }: { codeId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/code/{code_id}",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
