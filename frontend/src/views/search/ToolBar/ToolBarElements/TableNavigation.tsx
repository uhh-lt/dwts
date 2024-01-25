import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks";
import { SearchActions } from "../../searchSlice";
import TablePaginationActions from "./TablePaginationActions";

interface TableNavigationProps {
  numDocuments: number;
}

function TableNavigation({ numDocuments }: TableNavigationProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const page = useAppSelector((state) => state.search.page);
  const rowsPerPage = useAppSelector((state) => state.search.rowsPerPage);

  // ui event handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    dispatch(SearchActions.setPage(newPage));
  };

  const text = `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, numDocuments)} of ${numDocuments}`;

  return (
    <>
      {text}
      <TablePaginationActions
        count={numDocuments}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={handleChangePage}
      />
    </>
  );
}

export default TableNavigation;
