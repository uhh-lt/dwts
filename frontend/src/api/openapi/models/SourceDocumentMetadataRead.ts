/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SourceDocumentMetadataRead = {
  /**
   * Int Value of the SourceDocumentMetadata
   */
  int_value?: number;
  /**
   * String Value of the SourceDocumentMetadata
   */
  str_value?: string;
  /**
   * Boolean Value of the SourceDocumentMetadata
   */
  boolean_value?: boolean;
  /**
   * Date Value of the SourceDocumentMetadata
   */
  date_value?: string;
  /**
   * List Value of the SourceDocumentMetadata
   */
  list_value?: Array<string>;
  /**
   * ID of the SourceDocumentMetadata
   */
  id: number;
  /**
   * ID of the ProjectMetadata
   */
  project_metadata_id: number;
  /**
   * SourceDocument the SourceDocumentMetadata belongs to
   */
  source_document_id: number;
};
