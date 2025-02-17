import { Autocomplete, Button, ButtonGroup, Chip, MenuItem, Stack, TextField } from "@mui/material";
import { useState } from "react";
import CodeHooks from "../../api/CodeHooks.ts";
import TagHooks from "../../api/TagHooks.ts";
import UserHooks from "../../api/UserHooks.ts";
import { DocType } from "../../api/openapi/models/DocType.ts";
import { FilterOperator } from "../../api/openapi/models/FilterOperator.ts";
import { FilterValueType } from "../../api/openapi/models/FilterValueType.ts";
import { dateToLocaleYYYYMMDDString, isValidDateString } from "../../utils/DateUtils.ts";
import { docTypeToIcon } from "../../utils/docTypeToIcon.tsx";
import CodeRenderer from "../Code/CodeRenderer.tsx";
import TagRenderer from "../Tag/TagRenderer.tsx";
import UserRenderer from "../User/UserRenderer.tsx";
import { ColumnInfo, MyFilterExpression } from "./filterUtils.ts";

interface SharedFilterValueSelectorProps {
  filterExpression: MyFilterExpression;
  onChangeValue(id: string, value: string | number | boolean | string[]): void;
}

interface FilterValueSelectorProps extends SharedFilterValueSelectorProps {
  column2Info: Record<string, ColumnInfo>;
}

function FilterValueSelector({ filterExpression, onChangeValue, column2Info }: FilterValueSelectorProps) {
  const filterInfo = column2Info[filterExpression.column];
  switch (filterInfo.value) {
    case FilterValueType.TAG_ID:
      return <TagIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case FilterValueType.CODE_ID:
      return <CodeIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case FilterValueType.USER_ID:
      return <UserIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case FilterValueType.SPAN_ANNOTATION:
      return <SpanAnnotationValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case FilterValueType.DOC_TYPE:
      return <DocTypeValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
    case FilterValueType.INFER_FROM_OPERATOR:
      switch (filterInfo.operator) {
        case FilterOperator.ID:
        case FilterOperator.NUMBER:
          return (
            <TextField
              type="number"
              value={typeof filterExpression.value === "number" ? filterExpression.value : 0}
              onChange={(event) => onChangeValue(filterExpression.id, parseInt(event.target.value))}
              label="Value"
              variant="standard"
              fullWidth
              onKeyDown={(event) => {
                event.stopPropagation();
              }}
            />
          );
        case FilterOperator.STRING:
          return (
            <TextField
              type="text"
              value={typeof filterExpression.value === "string" ? filterExpression.value : ""}
              onChange={(event) => onChangeValue(filterExpression.id, event.target.value)}
              label="Value"
              variant="standard"
              fullWidth
              onKeyDown={(event) => {
                event.stopPropagation();
              }}
            />
          );
        case FilterOperator.ID_LIST:
          return <>Not Implemented!</>;
        case FilterOperator.LIST:
          return (
            <Autocomplete
              value={Array.isArray(filterExpression.value) ? (filterExpression.value as string[]) : []}
              onChange={(_event, newValue) => {
                onChangeValue(filterExpression.id, newValue);
              }}
              fullWidth
              multiple
              options={[]}
              freeSolo
              disableClearable
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={index}
                    style={{ borderRadius: "4px", height: "100%" }}
                    variant="filled"
                    label={option}
                  />
                ))
              }
              renderInput={(params) => <TextField {...params} fullWidth variant="standard" />}
              onKeyDown={(event) => {
                event.stopPropagation();
              }}
            />
          );
        case FilterOperator.DATE:
          return (
            <TextField
              variant="standard"
              type="date"
              value={
                typeof filterExpression.value === "string" && isValidDateString(filterExpression.value)
                  ? filterExpression.value
                  : dateToLocaleYYYYMMDDString(new Date())
              }
              onChange={(e) => onChangeValue(filterExpression.id, e.target.value)}
              fullWidth
              onKeyDown={(event) => {
                event.stopPropagation();
              }}
            />
          );
        case FilterOperator.BOOLEAN: {
          const value = typeof filterExpression.value === "boolean" ? filterExpression.value : false;
          return (
            <ButtonGroup>
              <Button
                variant={value === false ? "contained" : undefined}
                onClick={() => onChangeValue(filterExpression.id, false)}
              >
                False
              </Button>
              <Button
                variant={value === true ? "contained" : undefined}
                onClick={() => onChangeValue(filterExpression.id, true)}
              >
                True
              </Button>
            </ButtonGroup>
          );
        }
      }
      break;
    default:
      return <>FilterValueType not supported</>;
  }
}

function TagIdValueSelector({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) {
  // global server state (react-query)
  const projectTags = TagHooks.useGetAllTags();

  return (
    <TextField
      key={filterExpression.id}
      fullWidth
      select
      label="Value"
      variant="filled"
      defaultValue={
        typeof filterExpression.value === "string" ? parseInt(filterExpression.value) || -1 : filterExpression.value
      }
      onChange={(event) => onChangeValue(filterExpression.id, parseInt(event.target.value))}
      slotProps={{
        inputLabel: { shrink: true },
      }}
    >
      <MenuItem key={-1} value={-1}>
        <i>None</i>
      </MenuItem>
      {projectTags.data?.map((tag) => (
        <MenuItem key={tag.id} value={tag.id}>
          <TagRenderer tag={tag} />
        </MenuItem>
      ))}
    </TextField>
  );
}

function CodeIdValueSelector({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) {
  // global server state (react-query)
  const projectCodes = CodeHooks.useGetEnabledCodes();

  return (
    <TextField
      key={filterExpression.id}
      fullWidth
      select
      label="Value"
      variant="filled"
      defaultValue={
        typeof filterExpression.value === "string" ? parseInt(filterExpression.value) || -1 : filterExpression.value
      }
      onChange={(event) => onChangeValue(filterExpression.id, parseInt(event.target.value))}
      slotProps={{
        inputLabel: { shrink: true },
      }}
    >
      <MenuItem key={-1} value={-1}>
        <i>None</i>
      </MenuItem>
      {projectCodes.data?.map((code) => (
        <MenuItem key={code.id} value={code.id}>
          <CodeRenderer code={code} />
        </MenuItem>
      ))}
    </TextField>
  );
}

function UserIdValueSelector({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) {
  // global server state (react-query)
  const projectUsers = UserHooks.useGetAllUsers();

  return (
    <TextField
      key={filterExpression.id}
      fullWidth
      select
      label="Value"
      variant="filled"
      defaultValue={
        typeof filterExpression.value === "string" ? parseInt(filterExpression.value) || -1 : filterExpression.value
      }
      onChange={(event) => onChangeValue(filterExpression.id, parseInt(event.target.value))}
      slotProps={{
        inputLabel: { shrink: true },
      }}
    >
      <MenuItem key={-1} value={-1}>
        <i>None</i>
      </MenuItem>
      {projectUsers.data?.map((user) => (
        <MenuItem key={user.id} value={user.id}>
          <UserRenderer user={user} />
        </MenuItem>
      ))}
    </TextField>
  );
}

function SpanAnnotationValueSelector({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) {
  // global server state (react-query)
  const projectCodes = CodeHooks.useGetAllCodesList();

  const [value, setValue] = useState<string[]>(() => {
    // check if value is string[][] or string[], then make sure that value is string[]
    if (Array.isArray(filterExpression.value) && filterExpression.value.every((entry) => !Array.isArray(entry))) {
      return filterExpression.value as string[];
    }
    return ["-1", ""];
  });

  const handleCodeValueChange = (codeId: string) => {
    const newValue = [codeId, value[1]];
    setValue(newValue);
    onChangeValue(filterExpression.id, newValue);
  };

  const handleTextValueChange = (text: string) => {
    const newValue = [value[0], text];
    setValue(newValue);
    onChangeValue(filterExpression.id, newValue);
  };

  return (
    <>
      <TextField
        key={filterExpression.id}
        fullWidth
        select
        label="Code"
        variant="filled"
        value={value[0]}
        onChange={(event) => handleCodeValueChange(event.target.value)}
        slotProps={{
          inputLabel: { shrink: true },
        }}
      >
        <MenuItem key={"-1"} value={"-1"}>
          <i>None</i>
        </MenuItem>
        {projectCodes.data?.map((code) => (
          <MenuItem key={code.id} value={code.id.toString()}>
            <CodeRenderer code={code} />
          </MenuItem>
        ))}
      </TextField>
      <TextField
        type="text"
        value={value[1]}
        onChange={(event) => handleTextValueChange(event.target.value)}
        label="Text"
        variant="standard"
        fullWidth
      />
    </>
  );
}

function DocTypeValueSelector({ filterExpression, onChangeValue }: SharedFilterValueSelectorProps) {
  return (
    <TextField
      key={filterExpression.id}
      fullWidth
      select
      label="Value"
      variant="filled"
      value={filterExpression.value}
      onChange={(event) => onChangeValue(filterExpression.id, event.target.value)}
      slotProps={{
        inputLabel: { shrink: true },
      }}
    >
      <MenuItem key={"none"} value={"none"}>
        <i>None</i>
      </MenuItem>
      {Object.values(DocType).map((docType) => (
        <MenuItem key={docType} value={docType}>
          <Stack direction="row" alignItems="center">
            {docTypeToIcon[docType]}
            {docType}
          </Stack>
        </MenuItem>
      ))}
    </TextField>
  );
}

export default FilterValueSelector;
