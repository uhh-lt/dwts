import { Box, Stack } from "@mui/material";
import {
  DataGrid,
  GridCallbackDetails,
  GridColDef,
  GridRowSelectionModel,
  GridValueGetterParams,
} from "@mui/x-data-grid";
import * as React from "react";
import { useState } from "react";
import AnalysisHooks from "../../api/AnalysisHooks";
import { CodeOccurrence, CodeRead } from "../../api/openapi";
import { renderTextCellExpand } from "../../views/analysis/CodeFrequency/renderTextCellExpand";
import CodeSelector from "./CodeSelector";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID" },
  {
    field: "sdoc",
    headerName: "Document",
    flex: 1,
    valueGetter: (params: GridValueGetterParams) => params.row.sdoc.filename,
    renderCell: (params) => <>{params.row.sdoc.filename}</>,
  },
  {
    field: "code",
    headerName: "Code",
    flex: 1,
    valueGetter: (params: GridValueGetterParams) => params.row.code.name,
    renderCell: (params) => (
      <Stack direction="row" alignItems="center" component="span">
        <Box
          sx={{ width: 20, height: 20, backgroundColor: params.row.code.color, ml: 1.5, mr: 1, flexShrink: 0 }}
          component="span"
        />
        {params.row.code.name}
      </Stack>
    ),
  },
  {
    field: "text",
    headerName: "Text",
    flex: 4,
    description: "The text of the annotation",
    renderCell: renderTextCellExpand,
  },
  { field: "count", headerName: "Count", type: "number" },
];

interface AnnotationSelectorProps {
  projectId: number;
  userIds: number[];
  setSelectedAnnotations: (annotations: CodeOccurrence[]) => void;
}

function AnnotationSelector({ projectId, userIds, setSelectedAnnotations }: AnnotationSelectorProps) {
  // local state
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);

  // code selection
  const [selectedCode, setSelectedCode] = useState<CodeRead>();
  const handleCodeSelection = (codes: CodeRead[]) => {
    codes.length > 0 ? setSelectedCode(codes[0]) : setSelectedCode(undefined);
  };

  // global server state
  const codeOccurrences = AnalysisHooks.useCodeOccurrences(projectId, userIds, selectedCode?.id);
  const data = React.useMemo(() => {
    // we have to transform the data, better do this elsewhere?
    if (!codeOccurrences.data) return [];

    return codeOccurrences.data.map((row, index) => {
      return {
        ...row,
        id: index,
      };
    });
  }, [codeOccurrences.data]);

  // events
  const onSelectionChange = (selectionModel: GridRowSelectionModel, details: GridCallbackDetails<any>) => {
    setSelectionModel(selectionModel);
    setSelectedAnnotations(selectionModel.map((id) => data[id as number]));
  };

  return (
    <>
      <CodeSelector
        projectId={projectId}
        setSelectedCodes={handleCodeSelection}
        allowMultiselect={false}
        height="400px"
      />
      <div style={{ height: 400, width: "100%" }}>
        <DataGrid
          rows={data}
          columns={columns}
          autoPageSize
          // sx={{ border: "none" }}
          getRowId={(row) => row.id}
          checkboxSelection
          onRowSelectionModelChange={onSelectionChange}
          rowSelectionModel={selectionModel}
        />
      </div>
    </>
  );
}
export default AnnotationSelector;
