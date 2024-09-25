import { MouseEventHandler, useRef } from "react";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { SourceDocumentWithDataRead } from "../../../../api/openapi/models/SourceDocumentWithDataRead.ts";
import { SpanAnnotationReadResolved } from "../../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import SdocHooks from "../../../../api/SdocHooks.ts";
import DocumentRenderer from "../../../../views/annotation/DocumentRenderer/DocumentRenderer.tsx";
import useComputeTokenDataWithAnnotations from "../../../../views/annotation/DocumentRenderer/useComputeTokenDataWithAnnotations.ts";
import TextAnnotationValidationMenu, {
  TextAnnotationValidationMenuHandle,
  TextAnnotationValidationMenuProps,
} from "./TextAnnotationValidationMenu.tsx";
import "./validatorStyles.css";

interface TextAnnotatorValidatorSharedProps {
  codesForSelection: CodeRead[];
  annotations: SpanAnnotationReadResolved[];
  handleChangeAnnotations: (annotations: SpanAnnotationReadResolved[]) => void;
}

interface TextAnnotatorValidatorProps extends TextAnnotatorValidatorSharedProps {
  sdocId: number;
}

function TextAnnotationValidator({
  sdocId,
  codesForSelection,
  annotations,
  handleChangeAnnotations,
}: TextAnnotatorValidatorProps) {
  const sdoc = SdocHooks.useGetDocument(sdocId);

  if (sdoc.isSuccess) {
    return (
      <TextAnnotationValidatorWithSdoc
        sdoc={sdoc.data}
        codesForSelection={codesForSelection}
        annotations={annotations}
        handleChangeAnnotations={handleChangeAnnotations}
      />
    );
  }
  return null;
}

interface TextAnnotatorValidatorWithSdocProps extends TextAnnotatorValidatorSharedProps {
  sdoc: SourceDocumentWithDataRead;
}

function TextAnnotationValidatorWithSdoc({
  sdoc,
  codesForSelection,
  annotations,
  handleChangeAnnotations,
}: TextAnnotatorValidatorWithSdocProps) {
  // local state
  const menuRef = useRef<TextAnnotationValidationMenuHandle>(null);

  // computed
  const { tokenData, annotationsPerToken, annotationMap } = useComputeTokenDataWithAnnotations({
    sdoc: sdoc,
    annotations: annotations,
  });

  // actions
  const handleMouseUp: MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.button === 2 || !tokenData || !annotationsPerToken || !annotationMap) return;

    // try to find a parent element that has the tok class, we go up 3 levels at maximum
    let target: HTMLElement = event.target as HTMLElement;
    let found = false;
    for (let i = 0; i < 3; i++) {
      if (target && target.classList.contains("tok") && target.childElementCount > 0) {
        found = true;
        break;
      }
      if (target.parentElement) {
        target = target.parentElement;
      } else {
        break;
      }
    }
    if (!found) return;

    event.preventDefault();

    // get all annotations that span this token
    const tokenIndex = parseInt(target.getAttribute("data-tokenid")!);
    const annos = annotationsPerToken.get(tokenIndex);

    // open code selector if there are annotations
    if (annos) {
      // calculate position of the code selector (based on selection end)
      const boundingBox = target.getBoundingClientRect();
      const position = {
        left: boundingBox.left,
        top: boundingBox.top + boundingBox.height,
      };

      // open code selector
      menuRef.current!.open(
        position,
        annos.map((a) => annotationMap.get(a)!),
      );
    }
  };

  const handleClose: TextAnnotationValidationMenuProps["onClose"] = () => {};

  const handleEdit: TextAnnotationValidationMenuProps["onEdit"] = (annotationToEdit, newCode) => {
    handleChangeAnnotations(
      annotations.map((a) => {
        if (a.id === annotationToEdit.id) {
          return {
            ...a,
            code: newCode,
          };
        }
        return a;
      }),
    );
  };

  const handleDelete: TextAnnotationValidationMenuProps["onDelete"] = (annotationToDelete) => {
    handleChangeAnnotations(annotations.filter((a) => a.id !== annotationToDelete.id));
  };

  return (
    <>
      <TextAnnotationValidationMenu
        ref={menuRef}
        codesForSelection={codesForSelection}
        onClose={handleClose}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <DocumentRenderer
        className="myFlexFillAllContainer"
        onMouseUp={handleMouseUp}
        html={sdoc.html}
        tokenData={tokenData}
        annotationsPerToken={annotationsPerToken}
        annotationMap={annotationMap}
        isViewer={false}
        projectId={sdoc.project_id}
        style={{ zIndex: 1, overflowY: "auto" }}
      />
    </>
  );
}

export default TextAnnotationValidator;
