import MetadataHooks from "../../api/MetadataHooks.ts";
import { MetaType } from "../../api/openapi/models/MetaType.ts";
import { ProjectMetadataRead } from "../../api/openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataRead } from "../../api/openapi/models/SourceDocumentMetadataRead.ts";
import { dateToLocaleDateString } from "../../utils/DateUtils.ts";

interface SdocMetadataRendererProps {
  sdocId: number;
  projectMetadataId: number;
}

function SdocMetadataRenderer({ sdocId, projectMetadataId }: SdocMetadataRendererProps) {
  const sdocMetadata = MetadataHooks.useGetSdocMetadataByProjectMetadataId(sdocId, projectMetadataId);
  const projectMetadata = MetadataHooks.useGetProjectMetadata(projectMetadataId);

  if (projectMetadata.isSuccess && sdocMetadata.isSuccess && sdocMetadata.data !== undefined) {
    return <SdocMetadataRendererWithData sdocMetadata={sdocMetadata.data} projectMetadata={projectMetadata.data} />;
  } else if (sdocMetadata.isSuccess && sdocMetadata.data === undefined) {
    return <i>empty</i>;
  } else if (sdocMetadata.isError) {
    return <div>{sdocMetadata.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
}

export function SdocMetadataRendererWithData({
  sdocMetadata,
  projectMetadata,
}: {
  sdocMetadata: SourceDocumentMetadataRead;
  projectMetadata: ProjectMetadataRead;
}) {
  switch (projectMetadata.metatype) {
    case MetaType.STRING:
      return <>{sdocMetadata.str_value ? sdocMetadata.str_value : <i>empty</i>}</>;
    case MetaType.NUMBER:
      return <>{sdocMetadata.int_value ? sdocMetadata.int_value : <i>empty</i>}</>;
    case MetaType.DATE:
      return <>{sdocMetadata.date_value ? dateToLocaleDateString(sdocMetadata.date_value) : <i>empty</i>}</>;
    case MetaType.BOOLEAN:
      return <>{sdocMetadata.boolean_value ? sdocMetadata.boolean_value : <i>empty</i>}</>;
    case MetaType.LIST:
      return <>{sdocMetadata.list_value ? sdocMetadata.list_value.join(", ") : <i>empty</i>}</>;
    default:
      return <>Unkown MetaType!</>;
  }
}

export default SdocMetadataRenderer;
