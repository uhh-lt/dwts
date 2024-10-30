import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationReadResolved } from "../../api/openapi/models/BBoxAnnotationReadResolved.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { ProjectRead } from "../../api/openapi/models/ProjectRead.ts";
import { SourceDocumentRead } from "../../api/openapi/models/SourceDocumentRead.ts";
import { SpanAnnotationReadResolved } from "../../api/openapi/models/SpanAnnotationReadResolved.ts";
import BBoxAnnotationRenderer from "../BBoxAnnotation/BBoxAnnotationRenderer.tsx";
import CodeRenderer from "../Code/CodeRenderer.tsx";
import ProjectRenderer from "../SourceDocument/ProjectRenderer.tsx";
import SdocRenderer from "../SourceDocument/SdocRenderer.tsx";
import SpanAnnotationRenderer from "../SpanAnnotation/SpanAnnotationRenderer.tsx";
import TagRenderer from "../Tag/TagRenderer.tsx";

interface AttachedObjectRendererProps {
  attachedObject:
    | DocumentTagRead
    | SourceDocumentRead
    | CodeRead
    | SpanAnnotationReadResolved
    | BBoxAnnotationReadResolved
    | ProjectRead
    | number;
  attachedObjectType: AttachedObjectType;
  link?: boolean;
}

function AttachedObjectRenderer({ attachedObject, attachedObjectType, link }: AttachedObjectRendererProps) {
  switch (attachedObjectType) {
    case AttachedObjectType.BBOX_ANNOTATION:
      return <BBoxAnnotationRenderer bboxAnnotation={attachedObject as BBoxAnnotationReadResolved | number} />;
    case AttachedObjectType.SPAN_ANNOTATION:
      return (
        <SpanAnnotationRenderer spanAnnotation={attachedObject as SpanAnnotationReadResolved | number} link={link} />
      );
    case AttachedObjectType.DOCUMENT_TAG:
      return <TagRenderer tag={attachedObject as DocumentTagRead | number} />;
    case AttachedObjectType.CODE:
      return <CodeRenderer code={attachedObject as CodeRead | number} />;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return (
        <SdocRenderer
          sdoc={attachedObject as SourceDocumentRead | number}
          renderFilename
          renderDoctypeIcon
          link={link}
        />
      );
    case AttachedObjectType.PROJECT:
      return <ProjectRenderer project={attachedObject as ProjectRead | number} />;
    default:
      return <>{attachedObjectType}</>;
  }
}

export default AttachedObjectRenderer;
