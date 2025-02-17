import { Grid2, Typography } from "@mui/material";
import Portal from "@mui/material/Portal";
import { useContext } from "react";
import { useParams } from "react-router-dom";
import MemoTable from "../../components/Memo/MemoTable/MemoTable.tsx";
import { AppBarContext } from "../../layouts/TwoBarLayout.tsx";
import { useReduxConnector } from "../../utils/useReduxConnector.ts";
import LogbookEditor from "./LogbookEditor.tsx";
import { LogbookActions } from "./logbookSlice.ts";

const filterName = "logbook";

function Logbook() {
  const appBarContainerRef = useContext(AppBarContext);
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.logbook.rowSelectionModel,
    LogbookActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.logbook.sortingModel,
    LogbookActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.logbook.columnVisibilityModel,
    LogbookActions.onColumnVisibilityChange,
  );

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" component="div">
          Logbook
        </Typography>
      </Portal>
      <Grid2 container spacing={2} className="h100" bgcolor={"grey.200"} p={2}>
        <Grid2 size={{ md: 6 }} className="h100">
          <MemoTable
            projectId={projectId}
            filterName={filterName}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionChange={setRowSelectionModel}
            sortingModel={sortingModel}
            onSortingChange={setSortingModel}
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityChange={setColumnVisibilityModel}
            cardProps={{
              className: "myFlexContainer h100",
            }}
          />
        </Grid2>
        <Grid2 size={{ md: 6 }} className="h100">
          <LogbookEditor projectId={projectId} />
        </Grid2>
      </Grid2>
    </>
  );
}

export default Logbook;
