/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_documentTag_update_document_tags_batch } from "../models/Body_documentTag_update_document_tags_batch";
import type { DocumentTagCreate } from "../models/DocumentTagCreate";
import type { DocumentTagRead } from "../models/DocumentTagRead";
import type { DocumentTagUpdate } from "../models/DocumentTagUpdate";
import type { SourceDocumentDocumentTagLinks } from "../models/SourceDocumentDocumentTagLinks";
import type { SourceDocumentDocumentTagMultiLink } from "../models/SourceDocumentDocumentTagMultiLink";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class DocumentTagService {
  /**
   * Creates a new DocumentTag and returns it with the generated ID.
   * @returns DocumentTagRead Successful Response
   * @throws ApiError
   */
  public static createNewDocTag({
    requestBody,
  }: {
    requestBody: DocumentTagCreate;
  }): CancelablePromise<DocumentTagRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/doctag",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Links multiple DocumentTags with the SourceDocuments and returns the number of new Links
   * @returns number Successful Response
   * @throws ApiError
   */
  public static linkMultipleTags({
    requestBody,
  }: {
    requestBody: SourceDocumentDocumentTagMultiLink;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/doctag/bulk/link",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Unlinks all DocumentTags with the SourceDocuments and returns the number of removed Links.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static unlinkMultipleTags({
    requestBody,
  }: {
    requestBody: SourceDocumentDocumentTagMultiLink;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/doctag/bulk/unlink",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Sets SourceDocuments' tags to the provided tags
   * @returns number Successful Response
   * @throws ApiError
   */
  public static setDocumentTagsBatch({
    requestBody,
  }: {
    requestBody: Array<SourceDocumentDocumentTagLinks>;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/doctag/bulk/set",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates SourceDocuments' tags
   * @returns number Successful Response
   * @throws ApiError
   */
  public static updateDocumentTagsBatch({
    requestBody,
  }: {
    requestBody: Body_documentTag_update_document_tags_batch;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/doctag/bulk/update",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the DocumentTag with the given ID.
   * @returns DocumentTagRead Successful Response
   * @throws ApiError
   */
  public static getById({ tagId }: { tagId: number }): CancelablePromise<DocumentTagRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/doctag/{tag_id}",
      path: {
        tag_id: tagId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the DocumentTag with the given ID.
   * @returns DocumentTagRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    tagId,
    requestBody,
  }: {
    tagId: number;
    requestBody: DocumentTagUpdate;
  }): CancelablePromise<DocumentTagRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/doctag/{tag_id}",
      path: {
        tag_id: tagId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the DocumentTag with the given ID.
   * @returns DocumentTagRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ tagId }: { tagId: number }): CancelablePromise<DocumentTagRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/doctag/{tag_id}",
      path: {
        tag_id: tagId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SourceDocument IDs attached to the Tag with the given ID if it exists.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getSdocIdsByTagId({ tagId }: { tagId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/doctag/{tag_id}/sdocs",
      path: {
        tag_id: tagId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns a dict of all tag ids with their count of assigned source documents, counting only source documents in the given id list
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getSdocCounts({
    requestBody,
  }: {
    requestBody: Array<number>;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/doctag/sdoc_counts",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
