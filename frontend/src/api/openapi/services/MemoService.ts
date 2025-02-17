/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttachedObjectType } from "../models/AttachedObjectType";
import type { Body_memo_search_memos } from "../models/Body_memo_search_memos";
import type { ColumnInfo_MemoColumns_ } from "../models/ColumnInfo_MemoColumns_";
import type { MemoCreate } from "../models/MemoCreate";
import type { MemoRead } from "../models/MemoRead";
import type { MemoUpdate } from "../models/MemoUpdate";
import type { PaginatedElasticSearchDocumentHits } from "../models/PaginatedElasticSearchDocumentHits";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class MemoService {
  /**
   * Adds a Memo to the Attached Object with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static addMemo({
    attachedObjectId,
    attachedObjectType,
    requestBody,
  }: {
    attachedObjectId: number;
    attachedObjectType: AttachedObjectType;
    requestBody: MemoCreate;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/memo",
      query: {
        attached_object_id: attachedObjectId,
        attached_object_type: attachedObjectType,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Memo with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getById({ memoId }: { memoId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/memo/{memo_id}",
      path: {
        memo_id: memoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Memo with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    memoId,
    requestBody,
  }: {
    memoId: number;
    requestBody: MemoUpdate;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/memo/{memo_id}",
      path: {
        memo_id: memoId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the Memo with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ memoId }: { memoId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/memo/{memo_id}",
      path: {
        memo_id: memoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Memos attached to the object if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getMemosByAttachedObjectId({
    attachedObjId,
    attachedObjType,
  }: {
    attachedObjId: number;
    attachedObjType: AttachedObjectType;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/memo/attached_obj/{attached_obj_type}/to/{attached_obj_id}",
      path: {
        attached_obj_id: attachedObjId,
        attached_obj_type: attachedObjType,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the logged-in User's Memo attached to the object if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getUserMemoByAttachedObjectId({
    attachedObjId,
    attachedObjType,
  }: {
    attachedObjId: number;
    attachedObjType: AttachedObjectType;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/memo/attached_obj/{attached_obj_type}/to/{attached_obj_id}/user",
      path: {
        attached_obj_id: attachedObjId,
        attached_obj_type: attachedObjType,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns Memo Table Info.
   * @returns ColumnInfo_MemoColumns_ Successful Response
   * @throws ApiError
   */
  public static searchMemoInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_MemoColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/memo/info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Memo Ids that match the query parameters.
   * @returns PaginatedElasticSearchDocumentHits Successful Response
   * @throws ApiError
   */
  public static searchMemos({
    searchQuery,
    projectId,
    searchContent,
    pageNumber,
    pageSize,
    requestBody,
  }: {
    searchQuery: string;
    projectId: number;
    searchContent: boolean;
    pageNumber: number;
    pageSize: number;
    requestBody: Body_memo_search_memos;
  }): CancelablePromise<PaginatedElasticSearchDocumentHits> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/memo/search",
      query: {
        search_query: searchQuery,
        project_id: projectId,
        search_content: searchContent,
        page_number: pageNumber,
        page_size: pageSize,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
