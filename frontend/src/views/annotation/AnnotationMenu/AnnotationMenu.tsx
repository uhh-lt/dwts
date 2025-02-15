import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
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
  UseAutocompleteProps,
} from "@mui/material";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import CodeHooks from "../../../api/CodeHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationRead } from "../../../api/openapi/models/BBoxAnnotationRead.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { SentenceAnnotationRead } from "../../../api/openapi/models/SentenceAnnotationRead.ts";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import MemoButton from "../../../components/Memo/MemoButton.tsx";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { Annotation, Annotations } from "../Annotation.ts";
import { ICode } from "../ICode.ts";
import { useComputeCodesForSelection } from "./useComputeCodesForSelection.ts";

// interface ICodeFilter extends CodeRead {
//   title: string;
// }

const filter = createFilterOptions<ICodeFilterWithLevel>();

interface CodeSelectorProps {
  onClose?: (reason?: "backdropClick" | "escapeKeyDown") => void;
  onAdd?: (code: CodeRead, isNewCode: boolean) => void;
  onEdit?: (annotationToEdit: Annotation, newCode: ICode) => void;
  onDelete?: (annotationToDelete: Annotation) => void;
}

export interface CodeSelectorHandle {
  open: (position: PopoverPosition, annotations?: Annotations) => void;
  isOpen: boolean;
}

interface ICodeFilterWithLevel extends CodeRead {
  level: number;
  title: string;
}

const AnnotationMenu = forwardRef<CodeSelectorHandle, CodeSelectorProps>(
  ({ onClose, onAdd, onEdit, onDelete }, ref) => {
    // global client state (redux)
    const codes = useComputeCodesForSelection();
    const dispatch = useAppDispatch();

    // local client state
    const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [showCodeSelection, setShowCodeSelection] = useState(false);
    const [isAutoCompleteOpen, setIsAutoCompleteOpen] = useState(false);
    const [annotationsToEdit, setAnnotationsToEdit] = useState<Annotations | undefined>(undefined);
    const [editingAnnotation, setEditingAnnotation] = useState<Annotation | undefined>(undefined);
    const [autoCompleteValue, setAutoCompleteValue] = useState<ICodeFilterWithLevel | null>(null);

    // computed
    const codeOptions: ICodeFilterWithLevel[] = useMemo(() => {
      return codes.map((c: { data: CodeRead; level: number }) => ({
        ...c.data,
        level: c.level,
        title: c.data.name,
      }));
    }, [codes]);

    // exposed methods (via ref)
    useImperativeHandle(ref, () => ({
      open: openCodeSelector,
      isOpen: isPopoverOpen,
    }));

    // methods
    const openCodeSelector = (position: PopoverPosition, annotations?: Annotations) => {
      setEditingAnnotation(undefined);
      setAnnotationsToEdit(annotations);
      setShowCodeSelection(annotations === undefined);
      setIsPopoverOpen(true);
      setPosition(position);
    };

    const closeCodeSelector = (reason?: "backdropClick" | "escapeKeyDown") => {
      setShowCodeSelection(false);
      setIsPopoverOpen(false);
      setIsAutoCompleteOpen(false);
      setAutoCompleteValue(null);
      if (onClose) onClose(reason);
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
    const handleChange: UseAutocompleteProps<ICodeFilterWithLevel, false, false, true>["onChange"] = (
      _event,
      newValue,
    ) => {
      if (typeof newValue === "string") {
        alert("HOW DID YOU DO THIS? (Please tell Tim)");
        return;
      }

      if (newValue === null) {
        return;
      }

      // if code does not exist, open the code creation dialog
      if (newValue.id === -1) {
        dispatch(CRUDDialogActions.openCodeCreateDialog({ codeName: newValue.name, codeCreateSuccessHandler: submit }));
        return;
      }

      submit(newValue, false);
    };

    const handleEdit = (annotationToEdit: Annotation, code: CodeRead) => {
      setEditingAnnotation(annotationToEdit);
      setAutoCompleteValue({ ...code, title: code.name, level: 0 });
      setShowCodeSelection(true);
    };

    const handleDelete = (annotation: Annotation) => {
      if (onDelete) onDelete(annotation);
      closeCodeSelector();
    };

    // submit the code selector (either we edited or created a new code)
    const submit = (code: CodeRead, isNewCode: boolean) => {
      // when the user selected an annotation to edit, we were editing
      if (editingAnnotation !== undefined) {
        if (onEdit) onEdit(editingAnnotation, code);
        // otherwise, we opened this to add a new code
      } else {
        if (onAdd) onAdd(code, isNewCode);
      }
      closeCodeSelector();
    };

    return (
      <Popover
        open={isPopoverOpen}
        onClose={(_event, reason) => closeCodeSelector(reason)}
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
                codeId={annotation.code_id}
                annotation={annotation}
                handleDelete={handleDelete}
                handleEdit={handleEdit}
                handleOpenMemo={closeCodeSelector}
              />
            ))}
          </List>
        ) : (
          <>
            <Autocomplete<ICodeFilterWithLevel, false, false, true>
              value={autoCompleteValue}
              onChange={handleChange}
              filterOptions={(options, params) => {
                const filtered = filter(options, params);

                const { inputValue } = params;
                // Suggest the creation of a new value
                const isExisting = options.some((option: ICodeFilterWithLevel) => inputValue === option.name);
                if (inputValue.trim() !== "" && !isExisting) {
                  filtered.push({
                    title: `Add "${inputValue.trim()}"`,
                    name: inputValue.trim(),
                    id: -1,
                    color: "",
                    created: "",
                    updated: "",
                    description: "",
                    project_id: -1,
                    is_system: false,
                    level: 0,
                  });
                }

                return filtered;
              }}
              options={codeOptions}
              getOptionLabel={(option) => {
                // Value selected with enter, right from input
                if (typeof option === "string") {
                  return option;
                }
                return option.name;
              }}
              renderOption={(props, option) => {
                const indent = option.level * 10 + 10;
                return (
                  <li {...props} key={option.id} style={{ paddingLeft: indent }}>
                    <Box style={{ width: 20, height: 20, backgroundColor: option.color, marginRight: 8 }}></Box>{" "}
                    {option.title}
                  </li>
                );
              }}
              sx={{ width: 300 }}
              renderInput={(params) => <TextField autoFocus {...params} />}
              autoHighlight
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              open={isAutoCompleteOpen}
              onClose={(_event, reason) => reason === "escape" && closeCodeSelector("escapeKeyDown")}
            />
          </>
        )}
      </Popover>
    );
  },
);

export default AnnotationMenu;

interface CodeSelectorListItemProps {
  codeId: number;
  annotation: Annotation;
  handleOpenMemo: () => void;
  handleDelete: (annotationToDelete: Annotation) => void;
  handleEdit: (annotationToEdit: Annotation, newCode: CodeRead) => void;
}

const isBboxAnnotation = (annotation: Annotation): annotation is BBoxAnnotationRead => {
  return (annotation as BBoxAnnotationRead).x_min !== undefined;
};

const isSentenceAnnotation = (annotation: Annotation): annotation is SentenceAnnotationRead => {
  return (annotation as SentenceAnnotationRead).sentence_id_start !== undefined;
};

function CodeSelectorListItem({
  codeId,
  annotation,
  handleOpenMemo,
  handleEdit,
  handleDelete,
}: CodeSelectorListItemProps) {
  // global server state (react query)
  const code = CodeHooks.useGetCode(codeId);

  return (
    <>
      {code.data ? (
        <ListItem>
          <Box style={{ width: 20, height: 20, backgroundColor: code.data.color, marginRight: 8 }} />
          <ListItemText primary={code.data.name} />
          {isBboxAnnotation(annotation) ? (
            <MemoButton
              attachedObjectId={annotation.id}
              attachedObjectType={AttachedObjectType.BBOX_ANNOTATION}
              sx={{ ml: 1 }}
              onClick={() => handleOpenMemo()}
            />
          ) : isSentenceAnnotation(annotation) ? (
            <MemoButton
              attachedObjectId={annotation.id}
              attachedObjectType={AttachedObjectType.SENTENCE_ANNOTATION}
              sx={{ ml: 1 }}
              onClick={() => handleOpenMemo()}
            />
          ) : (
            <MemoButton
              attachedObjectId={annotation.id}
              attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
              sx={{ ml: 1 }}
              onClick={() => handleOpenMemo()}
            />
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
