import { useCallback } from "react";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { BBoxAnnotationRead } from "./openapi/models/BBoxAnnotationRead.ts";
import { CodeRead } from "./openapi/models/CodeRead.ts";
import { SpanAnnotationRead } from "./openapi/models/SpanAnnotationRead.ts";

export const useSelectEnabledSpanAnnotations = () => {
  const disabledCodeIds = useAppSelector((state: RootState) => state.annotations.disabledCodeIds);
  return useCallback(
    (data: SpanAnnotationRead[]) =>
      data.filter((spanAnnotation) => disabledCodeIds.indexOf(spanAnnotation.code_id) === -1),
    [disabledCodeIds],
  );
};

export const useSelectEnabledBboxAnnotations = () => {
  const disabledCodeIds = useAppSelector((state: RootState) => state.annotations.disabledCodeIds);
  return useCallback(
    (data: BBoxAnnotationRead[]) =>
      data.filter((bboxAnnotation) => disabledCodeIds.indexOf(bboxAnnotation.code_id) === -1),
    [disabledCodeIds],
  );
};

export const useSelectEnabledCodes = () => {
  const disabledCodeIds = useAppSelector((state: RootState) => state.annotations.disabledCodeIds);
  return useCallback(
    (data: CodeRead[]) => data.filter((code) => disabledCodeIds.indexOf(code.id) === -1),
    [disabledCodeIds],
  );
};
