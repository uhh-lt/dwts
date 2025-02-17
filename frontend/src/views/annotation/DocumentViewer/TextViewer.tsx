import React, { useRef } from "react";
import { SourceDocumentDataRead } from "../../../api/openapi/models/SourceDocumentDataRead.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { TagStyle } from "../annoSlice.ts";
import DocumentRenderer from "../DocumentRenderer/DocumentRenderer.tsx";
import useComputeTokenData from "../DocumentRenderer/useComputeTokenData.ts";
import SentenceMenu, { SentenceMenuHandle } from "./SentenceMenu.tsx";

interface TextViewerProps {
  sdocData: SourceDocumentDataRead;
}

/**
 * Super simple annotation rendering, does not work for overlapping annotations!!!
 */
function TextViewer({ sdocData: sdocData }: TextViewerProps) {
  // local state
  const sentenceMenuRef = useRef<SentenceMenuHandle>(null);

  // global client state (redux)
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const tagStyle = useAppSelector((state) => state.annotations.tagStyle);

  // global server state (react-query)
  const sentences = sdocData.sentences;
  const { tokenData, annotationsPerToken, annotationMap } = useComputeTokenData({
    sdocData,
    userId: visibleUserId,
  });

  // ui events
  const handleClick = (event: React.MouseEvent) => {
    if (!annotationsPerToken) return;
    if (!annotationMap) return;
    if (!sentences) return;

    // try to find a parent element that has the tok class, we go up 3 levels at maximum
    let element: HTMLElement = event.target as HTMLElement;
    let tokenIndex: number = NaN;
    let sentenceIndex: number = NaN;

    for (let i = 0; i < 3; i++) {
      if (isNaN(sentenceIndex)) {
        sentenceIndex = parseInt(element.getAttribute("data-sentenceid")!);
      }
      if (isNaN(tokenIndex)) {
        tokenIndex = parseInt(element.getAttribute("data-tokenid")!);
      }

      // traverse up the tree one element
      if (element.parentElement) {
        element = element.parentElement;
      } else {
        break;
      }
    }

    if (isNaN(tokenIndex) && isNaN(sentenceIndex)) return;

    event.preventDefault();

    // calculate position of the context menu (based on selection end)
    const boundingBox = (event.target as HTMLElement).getBoundingClientRect();
    const position = {
      left: boundingBox.left,
      top: boundingBox.top + boundingBox.height,
    };

    // get the sentence that spans the clicked element
    let sentence: string | undefined = undefined;
    if (!isNaN(sentenceIndex)) {
      sentence = sentences[sentenceIndex];
    }

    // get all annotations that span the clicked token
    let annos: number[] | undefined = undefined;
    if (!isNaN(tokenIndex)) {
      annos = annotationsPerToken.get(tokenIndex);
    }

    // open code selector if there are annotations
    if (annos || sentence) {
      sentenceMenuRef.current?.open(position, sentence, annos ? annos.map((a) => annotationMap.get(a)!) : undefined);
    }
  };

  return (
    <>
      <DocumentRenderer
        tokenData={tokenData}
        annotationsPerToken={annotationsPerToken}
        annotationMap={annotationMap}
        onClick={handleClick}
        isViewer={true}
        html={sdocData.html}
        projectId={sdocData.project_id}
        style={{
          zIndex: 1,
          overflowY: "auto",
          ...(tagStyle === TagStyle.Above && {
            lineHeight: "2.1rem",
          }),
        }}
        className="h100"
      />
      <SentenceMenu ref={sentenceMenuRef} />
    </>
  );
}

export default TextViewer;
