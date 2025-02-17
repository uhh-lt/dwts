/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SourceDocumentMetadataBulkUpdate } from "../models/SourceDocumentMetadataBulkUpdate";
import type { SourceDocumentMetadataCreate } from "../models/SourceDocumentMetadataCreate";
import type { SourceDocumentMetadataRead } from "../models/SourceDocumentMetadataRead";
import type { SourceDocumentMetadataUpdate } from "../models/SourceDocumentMetadataUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SdocMetadataService {
  /**
   * Creates a new Metadata and returns it with the generated ID.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static createNewMetadata({
    requestBody,
  }: {
    requestBody: SourceDocumentMetadataCreate;
  }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/sdocmeta",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Metadata with the given ID.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static getById({ metadataId }: { metadataId: number }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdocmeta/{metadata_id}",
      path: {
        metadata_id: metadataId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Metadata with the given ID.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    metadataId,
    requestBody,
  }: {
    metadataId: number;
    requestBody: SourceDocumentMetadataUpdate;
  }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sdocmeta/{metadata_id}",
      path: {
        metadata_id: metadataId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the Metadata with the given ID.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ metadataId }: { metadataId: number }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sdocmeta/{metadata_id}",
      path: {
        metadata_id: metadataId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates multiple metadata objects at once.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static updateBulk({
    requestBody,
  }: {
    requestBody: Array<SourceDocumentMetadataBulkUpdate>;
  }): CancelablePromise<Array<SourceDocumentMetadataRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sdocmeta/bulk/update",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
