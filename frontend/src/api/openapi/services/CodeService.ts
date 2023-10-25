/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_code_merge_codes } from "../models/Body_code_merge_codes";
import type { CodeCreate } from "../models/CodeCreate";
import type { CodeRead } from "../models/CodeRead";
import type { CodeUpdate } from "../models/CodeUpdate";
import type { MemoCreate } from "../models/MemoCreate";
import type { MemoRead } from "../models/MemoRead";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class CodeService {
  /**
   * Creates a new Code
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
   * Returns the Code linked by the CurrentCode
   * Returns the Code linked by the CurrentCode with the given ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getCodeByCurrentCodeId({ currentCodeId }: { currentCodeId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/current/{current_code_id}",
      path: {
        current_code_id: currentCodeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the Code
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
   * Deletes the Code
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

  /**
   * Updates the Code
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
   * Merges multiple Codes into another Code
   * Merges multiple Codes into another Code with the given ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static mergeCodes({
    requestBody,
    removeMergedCodes = true,
  }: {
    requestBody: Body_code_merge_codes;
    removeMergedCodes?: boolean;
  }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/code/merge/",
      query: {
        remove_merged_codes: removeMergedCodes,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the Memo attached to the Code
   * Returns the Memo attached to the Code with the given ID if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getMemos({ codeId }: { codeId: number }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/{code_id}/memo",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Adds a Memo to the Code
   * Adds a Memo to the Code with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static addMemo({
    codeId,
    requestBody,
  }: {
    codeId: number;
    requestBody: MemoCreate;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/code/{code_id}/memo",
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
   * Returns the Memos attached to the SpanAnnotation of the User with the given ID
   * Returns the Memos attached to the SpanAnnotation with the given ID of the User with the given ID if it exists.
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getUserMemos({
    codeId,
    userId,
  }: {
    codeId: number;
    userId: number;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/{code_id}/memo/{user_id}",
      path: {
        code_id: codeId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
