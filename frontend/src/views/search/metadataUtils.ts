import { MetaType } from "../../api/openapi/models/MetaType.ts";
import { ProjectMetadataRead } from "../../api/openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataRead } from "../../api/openapi/models/SourceDocumentMetadataRead.ts";
import { dateToLocaleYYYYMMDDString } from "../../utils/DateUtils.ts";

export const getValue = (metadata: SourceDocumentMetadataRead, projectMetadata: ProjectMetadataRead) => {
  switch (projectMetadata.metatype) {
    case MetaType.STRING:
      return metadata.str_value;
    case MetaType.NUMBER:
      return metadata.int_value;
    case MetaType.DATE:
      return metadata.date_value ? dateToLocaleYYYYMMDDString(metadata.date_value) : metadata.date_value;
    case MetaType.LIST:
      return metadata.list_value;
    case MetaType.BOOLEAN:
      return metadata.boolean_value;
  }
};
