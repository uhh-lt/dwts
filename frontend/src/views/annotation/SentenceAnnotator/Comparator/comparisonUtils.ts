import { SentenceAnnotationRead } from "../../../../api/openapi/models/SentenceAnnotationRead.ts";

export const isAnnotationSame = (anno1: SentenceAnnotationRead, anno2: SentenceAnnotationRead) => {
  return (
    anno1.code_id === anno2.code_id &&
    anno1.sentence_id_start === anno2.sentence_id_start &&
    anno1.sentence_id_end === anno2.sentence_id_end
  );
};
