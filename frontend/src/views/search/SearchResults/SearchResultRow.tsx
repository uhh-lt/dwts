import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Checkbox from "@mui/material/Checkbox";
import { Stack } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import { Link, useParams } from "react-router-dom";
import BorderColorIcon from "@mui/icons-material/BorderColor";
import MemoButton from "../../../features/memo-dialog/MemoButton";
import * as React from "react";
import { useMemo } from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import SdocHooks from "../../../api/SdocHooks";
import SearchResultTag from "./SearchResultTag";
import { SearchResultItem } from "./SearchResultItem";

function SearchResultRow({ sdocId, handleClick, handleOnContextMenu, handleOnCheckboxChange }: SearchResultItem) {
  // router
  const { projectId, sdocId: urlSdocId } = useParams() as { projectId: string; sdocId: string | undefined };

  // redux (global client state)
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const isShowTags = useAppSelector((state) => state.search.isShowTags);

  // query (global server state)
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const tags = SdocHooks.useGetAllDocumentTags(sdocId);

  const isSelected = useMemo(() => {
    return selectedDocumentIds.indexOf(sdocId) !== -1;
  }, [sdocId, selectedDocumentIds]);
  const labelId = `enhanced-table-checkbox-${sdocId}`;

  return (
    <TableRow
      hover
      onClick={() => sdoc.isSuccess && handleClick(sdoc.data)}
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={-1}
      selected={isSelected || parseInt(urlSdocId || "") === sdocId}
      onContextMenu={handleOnContextMenu(sdocId)}
      className={"myTableRow"}
    >
      <TableCell padding="checkbox" style={{ width: "48px" }}>
        <Checkbox
          color="primary"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={(event) => handleOnCheckboxChange(event, sdocId)}
          inputProps={{
            "aria-labelledby": labelId,
          }}
          disabled={!sdoc.isSuccess}
        />
      </TableCell>
      <TableCell
        component="th"
        id={labelId}
        scope="row"
        padding="none"
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          width: "80px",
        }}
      >
        {sdoc.isLoading && <>Loading</>}
        {sdoc.isError && <>Error: </>}
        {sdoc.isSuccess && <>{sdoc.data.filename}</>}
      </TableCell>
      <TableCell className={"myTableCell"}>
        <Stack direction={"row"} sx={{ alignItems: "center" }}>
          {tags.isLoading && <>...</>}
          {tags.isError && <>{tags.error.message}</>}
          {tags.isSuccess &&
            isShowTags &&
            tags.data.map((tag) => <SearchResultTag key={tag.id} label={tag.title} color={tag.description} />)}

          <div style={{ overflow: "hidden", textOverflow: "ellipsis", flexGrow: 1 }}>
            {sdoc.isLoading && <>...</>}
            {sdoc.isError && <>{sdoc.error.message}</>}
            {sdoc.isSuccess && <>{sdoc.data.content}</>}
          </div>
          <Stack direction={"row"} component={"span"} className={"myQuickMenu"}>
            <Tooltip title="Annotate">
              <IconButton
                component={Link}
                to={`/project/${projectId}/annotation/${sdocId}`}
                onClick={(e: any) => e.stopPropagation()}
              >
                <BorderColorIcon />
              </IconButton>
            </Tooltip>
            <MemoButton sdocId={sdocId} edge="end" />
          </Stack>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default SearchResultRow;
