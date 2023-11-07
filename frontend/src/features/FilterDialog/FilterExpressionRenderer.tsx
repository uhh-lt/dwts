import ClearIcon from "@mui/icons-material/Clear";
import { TreeItem } from "@mui/lab";
import { IconButton, Stack, Tooltip } from "@mui/material";
import { DocType } from "../../api/openapi";
import FilterColumnSelector from "./FilterColumnSelector";
import FilterOperatorSelector from "./FilterOperatorSelector";
import FilterValueSelector from "./FilterValueSelector";
import { FilterOperator, FilterOperatorType, MyFilterExpression } from "./filterUtils";

function FilterExpressionRenderer({
  filterExpression,
  columns,
  columns2operator,
  onDeleteFilter,
  onChangeColumn,
  onChangeOperator,
  onChangeValue,
}: {
  filterExpression: MyFilterExpression;
  columns: string[];
  columns2operator: Record<string, FilterOperatorType>;
  onDeleteFilter(id: string): void;
  onChangeColumn(id: string, column: string, metadataKey?: string, docType?: DocType): void;
  onChangeOperator(id: string, operator: FilterOperator): void;
  onChangeValue(id: string, value: string | number): void;
}) {
  return (
    <TreeItem
      key={filterExpression.id}
      nodeId={filterExpression.id}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      className="filterExpression"
      label={
        <Stack direction="row" alignItems="end" py={1}>
          <Tooltip title="Delete Filter Expression">
            <span>
              <IconButton
                size="small"
                onClick={() => onDeleteFilter(filterExpression.id)}
                sx={{ color: "inherit", mr: 1 }}
              >
                <ClearIcon />
              </IconButton>
            </span>
          </Tooltip>
          <FilterColumnSelector filterExpression={filterExpression} columns={columns} onChangeColumn={onChangeColumn} />
          <FilterOperatorSelector
            filterExpression={filterExpression}
            onChangeOperator={onChangeOperator}
            column2operator={columns2operator}
          />
          <FilterValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />
        </Stack>
      }
    />
  );
}

export default FilterExpressionRenderer;
