import { BBoxAnnotationRead } from "../../api/openapi/models/BBoxAnnotationRead.ts";
import { SentenceAnnotationRead } from "../../api/openapi/models/SentenceAnnotationRead.ts";
import { SpanAnnotationRead } from "../../api/openapi/models/SpanAnnotationRead.ts";

export type Annotation = SpanAnnotationRead | BBoxAnnotationRead | SentenceAnnotationRead;
export type Annotations = SpanAnnotationRead[] | BBoxAnnotationRead[] | SentenceAnnotationRead[];
