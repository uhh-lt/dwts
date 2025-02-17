import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  PopoverPosition,
} from "@mui/material";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { useNavigate } from "react-router-dom";
import CodeHooks from "../../../api/CodeHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead.ts";
import MemoListItemButton from "../../../components/Memo/MemoListItemButton.tsx";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../search/DocumentSearch/searchSlice.ts";
import { ImageSearchActions } from "../../search/ImageSearch/imageSearchSlice.ts";
import { SentenceSearchActions } from "../../search/SentenceSearch/sentenceSearchSlice.ts";

export interface SentenceMenuHandle {
  open: (
    position: PopoverPosition,
    sentence: string | undefined,
    annotations: SpanAnnotationRead[] | undefined,
  ) => void;
  close: () => void;
}

// eslint-disable-next-line no-empty-pattern
const SentenceMenu = forwardRef<SentenceMenuHandle>((_, ref) => {
  const navigate = useNavigate();

  // global server state
  const codeId2CodeMap = CodeHooks.useGetAllCodesMap();

  // local state
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [sentence, setSentence] = useState<string>();
  const [annotations, setAnnotations] = useState<SpanAnnotationRead[]>();

  // global client state (redux)
  const dispatch = useAppDispatch();

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  // methods
  const openMenu = (
    position: PopoverPosition,
    sentence: string | undefined,
    annotations: SpanAnnotationRead[] | undefined,
  ) => {
    setIsPopoverOpen(true);
    setPosition(position);
    setSentence(sentence);
    setAnnotations(annotations);
  };

  const closeMenu = () => {
    setIsPopoverOpen(false);
  };

  // ui events
  const handleSentenceSimilaritySearch = () => {
    closeMenu();
    dispatch(SentenceSearchActions.onSearchQueryChange(sentence || ""));
    dispatch(SentenceSearchActions.onClearRowSelection());
    closeMenu();
    navigate("../sentencesearch");
  };

  const handleImageSimilaritySearch = () => {
    dispatch(ImageSearchActions.onChangeSearchQuery(sentence || ""));
    dispatch(ImageSearchActions.clearSelectedDocuments());
    closeMenu();
    navigate("../imagesearch");
  };

  const handleAddFilter = (anno: SpanAnnotationRead) => {
    dispatch(
      SearchActions.onAddSpanAnnotationFilter({
        codeId: anno.code_id,
        spanText: anno.text,
        filterName: "root",
      }),
    );
    closeMenu();
    navigate("../search");
  };

  return (
    <Popover
      open={isPopoverOpen}
      onClose={() => closeMenu()}
      anchorPosition={position}
      anchorReference="anchorPosition"
      anchorOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
    >
      <List dense>
        <ListItem disablePadding>
          <ListItemButton onClick={handleSentenceSimilaritySearch} disabled={!sentence}>
            <ListItemIcon>
              <SearchIcon />
            </ListItemIcon>
            <ListItemText primary="Find similar sentences" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleImageSimilaritySearch} disabled={!sentence}>
            <ListItemIcon>
              <SearchIcon />
            </ListItemIcon>
            <ListItemText primary="Find similar images" />
          </ListItemButton>
        </ListItem>
        {annotations &&
          codeId2CodeMap.isSuccess &&
          annotations.map((anno) => {
            const code = codeId2CodeMap.data[anno.code_id];
            return (
              <React.Fragment key={anno.id}>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleAddFilter(anno)}>
                    <ListItemIcon>
                      <FilterAltIcon />
                    </ListItemIcon>
                    <ListItemText primary="Filter: " />
                    <Box
                      style={{
                        width: 20,
                        height: 20,
                        backgroundColor: code.color,
                        marginRight: 8,
                        marginLeft: 16,
                      }}
                    />
                    <ListItemText primary={`${code.name}: ${anno.text}`} />
                  </ListItemButton>
                </ListItem>
                <MemoListItemButton
                  onClick={() => closeMenu()}
                  attachedObjectId={anno.id}
                  attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
                  content={
                    <>
                      <ListItemText primary="Memo: " />
                      <Box
                        style={{
                          width: 20,
                          height: 20,
                          backgroundColor: code.color,
                          marginRight: 8,
                          marginLeft: 8,
                        }}
                      />
                      <ListItemText primary={`${code.name}: ${anno.text}`} />
                    </>
                  }
                />
              </React.Fragment>
            );
          })}
      </List>
    </Popover>
  );
});

export default SentenceMenu;
