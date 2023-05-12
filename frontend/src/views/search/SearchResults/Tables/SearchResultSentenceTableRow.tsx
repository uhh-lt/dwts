import { Stack, Tooltip } from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { AttachedObjectType, SimSearchSentenceHit } from "../../../../api/openapi";
import SdocHooks from "../../../../api/SdocHooks";
import MemoButton from "../../../../features/Memo/MemoButton";
import { useAppSelector } from "../../../../plugins/ReduxHooks";
import AnnotateButton from "../../ToolBar/ToolBarElements/AnnotateButton";
import { SearchResultProps } from "../SearchResultProps";
import SearchResultTag from "../SearchResultTag";

interface SearchResultSentenceRowProps extends SearchResultProps {
  hit: SimSearchSentenceHit;
}

function SearchResultSentenceTableRow({
  hit,
  handleClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
}: SearchResultSentenceRowProps) {
  // router
  const { projectId, sdocId: urlSdocId } = useParams() as { projectId: string; sdocId: string | undefined };

  // redux (global client state)
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const isShowTags = useAppSelector((state) => state.search.isShowTags);

  // query (global server state)
  const sdoc = SdocHooks.useGetDocument(hit.sdoc_id);
  const tags = SdocHooks.useGetAllDocumentTags(hit.sdoc_id);
  const sentences = SdocHooks.useGetDocumentSentences(hit.sdoc_id);

  const isSelected = useMemo(() => {
    return selectedDocumentIds.indexOf(hit.sdoc_id) !== -1;
  }, [hit.sdoc_id, selectedDocumentIds]);
  const labelId = `enhanced-table-checkbox-${hit.sdoc_id}`;

  return (
    <TableRow
      hover
      onClick={sdoc.isSuccess ? () => handleClick(sdoc.data) : undefined}
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={-1}
      selected={isSelected || parseInt(urlSdocId || "") === hit.sdoc_id}
      onContextMenu={handleOnContextMenu ? handleOnContextMenu(hit.sdoc_id) : undefined}
      className={"myTableRow"}
    >
      <TableCell padding="checkbox">
        <Checkbox
          color="primary"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={handleOnCheckboxChange ? (event) => handleOnCheckboxChange(event, hit.sdoc_id) : undefined}
          inputProps={{
            "aria-labelledby": labelId,
          }}
        />
      </TableCell>
      <TableCell>{(hit.score * 100).toFixed(0)}</TableCell>
      <Tooltip title={sdoc.data?.filename || "Please wait..."} placement="top-start" enterDelay={500} followCursor>
        <TableCell
          component="th"
          id={labelId}
          scope="row"
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sdoc.isLoading && <>Loading</>}
          {sdoc.isError && <>Error: </>}
          {sdoc.isSuccess && <>{sdoc.data.filename}</>}
        </TableCell>
      </Tooltip>
      <TableCell className={"myTableCell"}>
        <Stack direction={"row"} sx={{ alignItems: "center" }}>
          {tags.isLoading && <>...</>}
          {tags.isError && <>{tags.error.message}</>}
          {tags.isSuccess && isShowTags && tags.data.map((tag) => <SearchResultTag key={tag.id} tagId={tag.id} />)}

          {sentences.isLoading && <>...</>}
          {sentences.isError && <>{sentences.error.message}</>}
          {sentences.isSuccess && (
            <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {sentences.data.sentences[hit.sentence_id]}
            </div>
          )}
          <Stack direction={"row"} component={"span"} className={"myQuickMenu"}>
            <AnnotateButton projectId={projectId} sdocId={hit.sdoc_id} />
            <MemoButton
              attachedObjectId={hit.sdoc_id}
              attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT}
              edge="end"
            />
          </Stack>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default SearchResultSentenceTableRow;
