import { useQueryClient } from "@tanstack/react-query";
import React, { MouseEvent, useRef, useState } from "react";
import { QueryKey } from "../../../api/QueryKey.ts";
import SpanAnnotationHooks, { FAKE_ANNOTATION_ID } from "../../../api/SpanAnnotationHooks.ts";

import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { SourceDocumentDataRead } from "../../../api/openapi/models/SourceDocumentDataRead.ts";
import { SpanAnnotationCreate } from "../../../api/openapi/models/SpanAnnotationCreate.ts";
import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { Annotation } from "../Annotation.ts";
import AnnotationMenu, { CodeSelectorHandle } from "../AnnotationMenu/AnnotationMenu.tsx";
import DocumentRenderer from "../DocumentRenderer/DocumentRenderer.tsx";
import useComputeTokenData from "../DocumentRenderer/useComputeTokenData.ts";
import { ICode } from "../ICode.ts";
import { AnnoActions, TagStyle } from "../annoSlice.ts";

const selectionIsEmpty = (selection: Selection): boolean => {
  return selection.toString().trim().length === 0;
};

interface TextAnnotatorProps {
  sdocData: SourceDocumentDataRead;
}

function TextAnnotator({ sdocData }: TextAnnotatorProps) {
  // local state
  const spanMenuRef = useRef<CodeSelectorHandle>(null);
  const [fakeAnnotation, setFakeAnnotation] = useState<SpanAnnotationCreate | undefined>(undefined);

  // global client state (redux)
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const mostRecentCode = useAppSelector((state) => state.annotations.mostRecentCode);
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const tagStyle = useAppSelector((state) => state.annotations.tagStyle);
  const dispatch = useAppDispatch();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // computed / custom hooks
  const { tokenData, annotationsPerToken, annotationMap } = useComputeTokenData({
    sdocData,
    userId: visibleUserId,
  });

  // mutations for create, update, delete
  const queryClient = useQueryClient();
  const createMutation = SpanAnnotationHooks.useCreateSpanAnnotation();
  const updateMutation = SpanAnnotationHooks.useUpdateSpanAnnotation();
  const deleteMutation = SpanAnnotationHooks.useDeleteSpanAnnotation();

  // handle ui events
  const handleMenu = (event: React.MouseEvent) => {
    if (!annotationsPerToken) return;
    if (!annotationMap) return;

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
      spanMenuRef.current!.open(
        position,
        annos.map((a) => annotationMap.get(a)!),
      );
    }
  };

  const handleMouseUp = async (event: MouseEvent) => {
    if (event.button === 2) return;
    if (!tokenData) return;

    const selection = window.getSelection();
    // the selection is empty
    if (!selection || selectionIsEmpty(selection)) {
      handleMenu(event);
      return;
    }
    // the selection is valid

    if (!mostRecentCode && !selectedCodeId) {
      openSnackbar({
        severity: "warning",
        text: "Select a code in the Code Explorer (left) first!",
      });
      selection.empty();
      return;
    }

    // get the selected begin and end token
    let selectionStartElement = selection?.anchorNode?.parentElement;
    let selectionEndElement = selection?.focusNode?.parentElement;

    while (selectionStartElement && selectionStartElement?.getAttribute("data-tokenid") === null) {
      selectionStartElement = selectionStartElement?.parentElement;
    }

    while (selectionEndElement && selectionEndElement?.getAttribute("data-tokenid") === null) {
      selectionEndElement = selectionEndElement?.parentElement;
    }

    const selectionStart = selectionStartElement?.getAttribute("data-tokenid");
    const selectionEnd = selectionEndElement?.getAttribute("data-tokenid");
    if (!selectionStart || !selectionEnd) return;

    const begin = parseInt(selectionStart);
    const end = parseInt(selectionEnd);

    // swap begin and end if necessary (left to right, right to left annotation)
    selectionStartElement = end < begin ? selectionEndElement : selectionStartElement;
    const begin_token = end < begin ? end : begin;
    const end_token = end < begin ? begin : end;

    const span_text = tokenData
      .slice(begin_token, end_token + 1)
      .map((t) => t.text)
      .join(" ");

    const requestBody: SpanAnnotationCreate = {
      code_id: mostRecentCode?.id || selectedCodeId || -1,
      sdoc_id: sdocData.id,
      begin: tokenData[begin_token].beginChar,
      end: tokenData[end_token].endChar,
      begin_token: begin_token,
      end_token: end_token + 1,
      span_text: span_text,
    };

    // create a fake annotation
    setFakeAnnotation(requestBody);

    // when we create a new span annotation, we add a new annotation to a certain document
    // thus, we only affect the annotation document that we are adding to
    const affectedQueryKey = [QueryKey.SDOC_SPAN_ANNOTATIONS, requestBody.sdoc_id, visibleUserId];

    // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    await queryClient.cancelQueries({ queryKey: affectedQueryKey });

    // Add a fake annotation
    queryClient.setQueryData<SpanAnnotationRead[]>(affectedQueryKey, (old) => {
      const spanAnnotation = {
        ...requestBody,
        id: FAKE_ANNOTATION_ID,
        text: requestBody.span_text,
        code: {
          name: "",
          color: "",
          description: "",
          id: requestBody.code_id,
          project_id: 0,
          created: "",
          updated: "",
          is_system: false,
        },
        created: "",
        updated: "",
        user_id: 0,
      };
      return old === undefined ? [spanAnnotation] : [...old, spanAnnotation];
    });

    // open code selector
    const target = selectionStartElement;
    if (target) {
      // calculate position of the code selector (based on selection end)
      const boundingBox = target.getBoundingClientRect();
      const position = {
        left: boundingBox.left,
        top: boundingBox.top + boundingBox.height,
      };

      // open code selector
      spanMenuRef.current!.open(position);
    }

    // clear selection
    selection.empty();
  };

  // handle code selector events
  const handleCodeSelectorDeleteAnnotation = (annotation: Annotation) => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to remove the SpanAnnotation ${annotation.id}? You can reassign it later!`,
      onAccept: () => {
        deleteMutation.mutate(
          { spanAnnotationToDelete: annotation as SpanAnnotationRead },
          {
            onSuccess: (spanAnnotation) => {
              openSnackbar({
                text: `Deleted Span Annotation ${spanAnnotation.id}`,
                severity: "success",
              });
            },
          },
        );
      },
    });
  };
  const handleCodeSelectorEditCode = (annotation: Annotation, code: ICode) => {
    updateMutation.mutate(
      {
        spanAnnotationToUpdate: annotation as SpanAnnotationRead,
        requestBody: {
          code_id: code.id,
        },
      },
      {
        onSuccess: (spanAnnotation) => {
          openSnackbar({
            text: `Updated Span Annotation ${spanAnnotation.id}`,
            severity: "success",
          });
        },
      },
    );
  };
  const handleCodeSelectorAddCode = (code: CodeRead, isNewCode: boolean) => {
    if (!fakeAnnotation) return;
    createMutation.mutate(
      {
        ...fakeAnnotation,
        code_id: code.id,
      },
      {
        onSuccess: () => {
          if (!isNewCode) {
            // if we use an existing code to annotate, we move it to the top
            dispatch(AnnoActions.moveCodeToTop(code));
          }
        },
      },
    );
  };
  const handleCodeSelectorClose = (reason?: "backdropClick" | "escapeKeyDown") => {
    // i am about to create an annotation
    if (fakeAnnotation) {
      // i clicked away because i like the annotation as is
      if (reason === "backdropClick") {
        // add the annotation as is
        createMutation.mutate({ ...fakeAnnotation });
      }
      // i clicked escape because i want to cancel the annotation
      if (reason === "escapeKeyDown") {
        // delete the fake annotation (that always has id -1)
        queryClient.setQueryData<SpanAnnotationRead[]>(
          [QueryKey.SDOC_SPAN_ANNOTATIONS, fakeAnnotation.sdoc_id, visibleUserId],
          (old) => old?.filter((spanAnnotation) => spanAnnotation.id !== -1),
        );
      }
    }
    setFakeAnnotation(undefined);
  };

  return (
    <>
      <AnnotationMenu
        ref={spanMenuRef}
        onAdd={handleCodeSelectorAddCode}
        onClose={handleCodeSelectorClose}
        onEdit={handleCodeSelectorEditCode}
        onDelete={handleCodeSelectorDeleteAnnotation}
      />
      <DocumentRenderer
        className="myFlexFillAllContainer"
        onMouseUp={handleMouseUp}
        html={sdocData.html}
        tokenData={tokenData}
        annotationsPerToken={annotationsPerToken}
        annotationMap={annotationMap}
        isViewer={false}
        projectId={sdocData.project_id}
        style={{
          zIndex: 1,
          overflowY: "auto",
          ...(tagStyle === TagStyle.Above && {
            lineHeight: "2.1rem",
          }),
        }}
      />
    </>
  );
}

export default TextAnnotator;
