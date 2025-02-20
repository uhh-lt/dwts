/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExportFormat } from "./ExportFormat";
import type { ExportJobType } from "./ExportJobType";
import type { SingleDocAllUserAnnotationsExportJobParams } from "./SingleDocAllUserAnnotationsExportJobParams";
import type { SingleDocSingleUserAnnotationsExportJobParams } from "./SingleDocSingleUserAnnotationsExportJobParams";
import type { SingleProjectAllCodesExportJobParams } from "./SingleProjectAllCodesExportJobParams";
import type { SingleProjectAllDataExportJobParams } from "./SingleProjectAllDataExportJobParams";
import type { SingleProjectAllTagsExportJobParams } from "./SingleProjectAllTagsExportJobParams";
import type { SingleProjectAllUserExportJobParams } from "./SingleProjectAllUserExportJobParams";
import type { SingleProjectSelectedSdocsParams } from "./SingleProjectSelectedSdocsParams";
import type { SingleProjectSelectedSentenceAnnotationsParams } from "./SingleProjectSelectedSentenceAnnotationsParams";
import type { SingleProjectSelectedSpanAnnotationsParams } from "./SingleProjectSelectedSpanAnnotationsParams";
import type { SingleUserAllDataExportJobParams } from "./SingleUserAllDataExportJobParams";
import type { SingleUserAllMemosExportJobParams } from "./SingleUserAllMemosExportJobParams";
import type { SingleUserLogbookExportJobParams } from "./SingleUserLogbookExportJobParams";
export type ExportJobParameters = {
  /**
   * The type of the export job (what to export)
   */
  export_job_type: ExportJobType;
  /**
   * The format of the exported data.
   */
  export_format?: ExportFormat;
  /**
   * Specific parameters for the export job w.r.t it's type
   */
  specific_export_job_parameters:
    | SingleProjectAllDataExportJobParams
    | SingleProjectAllUserExportJobParams
    | SingleProjectAllTagsExportJobParams
    | SingleProjectAllCodesExportJobParams
    | SingleProjectSelectedSdocsParams
    | SingleProjectSelectedSpanAnnotationsParams
    | SingleProjectSelectedSentenceAnnotationsParams
    | SingleUserAllDataExportJobParams
    | SingleUserAllMemosExportJobParams
    | SingleUserLogbookExportJobParams
    | SingleDocAllUserAnnotationsExportJobParams
    | SingleDocSingleUserAnnotationsExportJobParams;
};
