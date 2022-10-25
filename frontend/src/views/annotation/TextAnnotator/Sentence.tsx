import React from "react";
import "./Sentence.css";
import { SentenceContextMenuHandle } from "../SentenceContextMenu/SentenceContextMenu";

interface SentenceProps {
  sentenceMenuRef: React.RefObject<SentenceContextMenuHandle>;
  disableHighlighting: boolean;
  disableInteraction: boolean;
  children?: React.ReactNode;
}

function Sentence({ sentenceMenuRef, children, disableHighlighting, disableInteraction }: SentenceProps) {
  // ui events
  const handleClick = (event: React.MouseEvent) => {
    if (disableInteraction) return;

    event.preventDefault();
    const boundingBox = (event.target as HTMLElement).getBoundingClientRect();
    const position = {
      left: boundingBox.left,
      top: boundingBox.top + boundingBox.height,
    };
    sentenceMenuRef.current?.open(position);
  };

  return (
    <span className={disableHighlighting ? "" : "sentence"} onClick={handleClick} onContextMenu={handleClick}>
      {children}
    </span>
  );
}

export default Sentence;
