import {
  Autocomplete,
  Box,
  createFilterOptions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
  PopoverPosition,
  TextField,
  Tooltip,
} from "@mui/material";
import React, { forwardRef, SyntheticEvent, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { ICode } from "../TextAnnotator/ICode";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CodeCreationDialog, { CodeCreationDialogHandle } from "./CodeCreationDialog";
import CodeHooks from "../../../api/CodeHooks";
import MemoButton from "../../../features/memo-dialog/MemoButton";
import { BBoxAnnotationReadResolvedCode, CodeRead, SpanAnnotationReadResolved } from "../../../api/openapi";

interface ICodeFilter extends ICode {
  title: string;
}

const filter = createFilterOptions<ICodeFilter>();

interface CodeSelectorProps {
  onClose?: () => void;
  onAdd?: (code: ICode) => void;
  onEdit?: (annotationToEdit: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode, newCode: ICode) => void;
  onDelete?: (annotationToDelete: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode) => void;
}

export interface CodeSelectorHandle {
  open: (
    position: PopoverPosition,
    annotations?: SpanAnnotationReadResolved[] | BBoxAnnotationReadResolvedCode[] | undefined
  ) => void;
}

const CodeContextMenu = forwardRef<CodeSelectorHandle, CodeSelectorProps>(
  ({ onClose, onAdd, onEdit, onDelete }, ref) => {
    // global client state (redux)
    const codes = useAppSelector((state) => state.annotations.codesForSelection);

    // local client state
    const codeCreationDialogRef = useRef<CodeCreationDialogHandle>(null);
    const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [showCodeSelection, setShowCodeSelection] = useState(false);
    const [isAutoCompleteOpen, setIsAutoCompleteOpen] = useState(false);
    const [annotationsToEdit, setAnnotationsToEdit] = useState<
      SpanAnnotationReadResolved[] | BBoxAnnotationReadResolvedCode[] | undefined
    >(undefined);
    const [editingAnnotation, setEditingAnnotation] = useState<
      SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode | undefined
    >(undefined);
    const [autoCompleteValue, setAutoCompleteValue] = useState<ICodeFilter | null>(null);

    // computed
    const codeOptions: ICodeFilter[] = useMemo(
      () =>
        codes.map((c) => {
          return {
            ...c,
            title: c.name,
          };
        }),
      [codes]
    );

    // exposed methods (via ref)
    useImperativeHandle(ref, () => ({
      open: openCodeSelector,
    }));

    // methods
    const openCodeSelector = (
      position: PopoverPosition,
      annotations: SpanAnnotationReadResolved[] | BBoxAnnotationReadResolvedCode[] | undefined = undefined
    ) => {
      setEditingAnnotation(undefined);
      setAnnotationsToEdit(annotations);
      setShowCodeSelection(annotations === undefined);
      setIsPopoverOpen(true);
      setPosition(position);
    };

    const closeCodeSelector = () => {
      setShowCodeSelection(false);
      setIsPopoverOpen(false);
      setIsAutoCompleteOpen(false);
      setAutoCompleteValue(null);
      if (onClose) onClose();
    };

    // effects
    // automatically open the autocomplete soon after the code selection is shown
    useEffect(() => {
      if (showCodeSelection) {
        setTimeout(() => {
          setIsAutoCompleteOpen(showCodeSelection);
        }, 250);
      }
    }, [showCodeSelection]);

    // event handlers
    const handleChange = (event: SyntheticEvent<Element, Event>, newValue: ICodeFilter | string | null) => {
      if (typeof newValue === "string") {
        alert("HOW DID YOU DO THIS? (Please tell Tim)");
        return;
      }

      if (newValue === null) {
        return;
      }

      // if code does not exist, open the code creation dialog
      if (newValue.id === -1) {
        codeCreationDialogRef.current!.open(newValue.name);
        return;
      }

      submit(newValue);
    };

    const handleEdit = (
      annotationToEdit: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode,
      code: CodeRead
    ) => {
      setEditingAnnotation(annotationToEdit);
      setAutoCompleteValue({ ...code, title: code.name });
      setShowCodeSelection(true);
    };

    const handleDelete = (annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode) => {
      if (onDelete) onDelete(annotation);
      closeCodeSelector();
    };

    // submit the code selector (either we edited or created a new code)
    const submit = (code: ICode) => {
      // when the user selected an annotation to edit, we were editing
      if (editingAnnotation !== undefined) {
        if (onEdit) onEdit(editingAnnotation, code);
        // otherwise, we opened this to add a new code
      } else {
        if (onAdd) onAdd(code);
      }
      closeCodeSelector();
    };

    return (
      <Popover
        open={isPopoverOpen}
        onClose={closeCodeSelector}
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
        {!showCodeSelection && annotationsToEdit ? (
          <List dense>
            {annotationsToEdit.map((annotation) => (
              <CodeSelectorListItem
                key={annotation.id}
                codeId={annotation.code.id}
                annotation={annotation}
                handleDelete={handleDelete}
                handleEdit={handleEdit}
              />
            ))}
          </List>
        ) : (
          <>
            <Autocomplete
              value={autoCompleteValue}
              onChange={(event, newValue) => handleChange(event, newValue)}
              filterOptions={(options, params) => {
                const filtered = filter(options, params);

                const { inputValue } = params;
                // Suggest the creation of a new value
                const isExisting = options.some((option: ICode) => inputValue === option.name);
                if (inputValue.trim() !== "" && !isExisting) {
                  filtered.push({
                    title: `Add "${inputValue.trim()}"`,
                    name: inputValue.trim(),
                    id: -1,
                    color: "",
                  });
                }

                return filtered;
              }}
              options={codeOptions}
              getOptionLabel={(option) => {
                // Value selected with enter, right from the input
                if (typeof option === "string") {
                  return option;
                }
                return option.name;
              }}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box style={{ width: 20, height: 20, backgroundColor: option.color, marginRight: 8 }}></Box>{" "}
                  {option.title}
                </li>
              )}
              sx={{ width: 300 }}
              renderInput={(params) => <TextField autoFocus {...params} />}
              autoHighlight
              selectOnFocus
              clearOnBlur
              clearOnEscape
              handleHomeEndKeys
              freeSolo
              open={isAutoCompleteOpen}
            />
            <CodeCreationDialog ref={codeCreationDialogRef} onCreateSuccess={submit} />
          </>
        )}
      </Popover>
    );
  }
);

export default CodeContextMenu;

interface CodeSelectorListItemProps {
  codeId: number;
  annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode;
  handleDelete: (annotationToDelete: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode) => void;
  handleEdit: (
    annotationToEdit: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode,
    newCode: CodeRead
  ) => void;
}

const isBboxAnnotation = (
  annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode
): annotation is BBoxAnnotationReadResolvedCode => {
  return (annotation as BBoxAnnotationReadResolvedCode).x_min !== undefined;
};

function CodeSelectorListItem({ codeId, annotation, handleEdit, handleDelete }: CodeSelectorListItemProps) {
  // global server state (react query)
  const code = CodeHooks.useGetCode(codeId);

  return (
    <>
      {code.data ? (
        <ListItem>
          <Box style={{ width: 20, height: 20, backgroundColor: code.data.color, marginRight: 8 }} />
          <ListItemText primary={code.data.name} />
          {isBboxAnnotation(annotation) ? (
            <MemoButton bboxId={annotation.id} sx={{ ml: 1 }} />
          ) : (
            <MemoButton spanAnnotationId={annotation.id} sx={{ ml: 1 }} />
          )}
          <Tooltip title="Delete">
            <IconButton onClick={() => handleDelete(annotation)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton edge="end" onClick={() => handleEdit(annotation, code.data)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
        </ListItem>
      ) : null}
    </>
  );
}
