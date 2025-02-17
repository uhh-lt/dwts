import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { IconButtonProps } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useCallback } from "react";
import { ProjectMetadataRead } from "../../../../../api/openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataRead } from "../../../../../api/openapi/models/SourceDocumentMetadataRead.ts";
import { useAppDispatch } from "../../../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../../../../views/search/DocumentSearch/searchSlice.ts";

interface DocumentMetadataAddFilterButtonProps {
  metadata: SourceDocumentMetadataRead;
  projectMetadata: ProjectMetadataRead;
  filterName: string;
}

function DocumentMetadataAddFilterButton({
  metadata,
  projectMetadata,
  filterName,
  ...props
}: DocumentMetadataAddFilterButtonProps & IconButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  const handleAddMetadataFilter = useCallback(() => {
    dispatch(SearchActions.onAddMetadataFilter({ metadata, projectMetadata, filterName }));
  }, [dispatch, metadata, projectMetadata, filterName]);

  return (
    <Tooltip title="Add as filter">
      <span>
        <IconButton {...props} onClick={handleAddMetadataFilter}>
          <FilterAltIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default DocumentMetadataAddFilterButton;
