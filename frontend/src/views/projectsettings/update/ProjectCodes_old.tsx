import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Tree, { Node } from "ts-tree-structure";
import ProjectHooks from "../../../api/ProjectHooks";
import { CodeRead } from "../../../api/openapi";
import CodeCreateDialog, { openCodeCreateDialog } from "../../../features/CrudDialog/Code/CodeCreateDialog";
import CodeEditDialog from "../../../features/CrudDialog/Code/CodeEditDialog";
import CodeEditButton from "../../annotation/CodeExplorer/CodeEditButton";
import CodeToggleEnabledButton from "../../annotation/CodeExplorer/CodeToggleEnabledButton";
import CodeToggleVisibilityButton from "../../annotation/CodeExplorer/CodeToggleVisibilityButton";
import CodeTreeView from "../../annotation/CodeExplorer/CodeTreeView";
import { ICodeTree } from "../../annotation/CodeExplorer/ICodeTree";
import { codesToTree } from "../../annotation/CodeExplorer/TreeUtils";
import { ProjectProps } from "./ProjectProps";
import { filterTree } from "../../../features/TagExplorer/TreeUtils";

function ProjectCodes({ project }: ProjectProps) {
  // local state
  const [expandedCodeIds, setExpandedCodeIds] = useState<string[]>([]);
  const [codeFilter, setCodeFilter] = useState<string>("");
  const expandCodes = useCallback((codesToExpand: string[]) => {
    setExpandedCodeIds((prev) => {
      for (const codeId of codesToExpand) {
        if (prev.indexOf(codeId) === -1) {
          prev.push(codeId);
        }
      }
      return prev.slice();
    });
  }, []);

  // global server state (react query)
  const projectCodes = ProjectHooks.useGetAllCodes(project.id, true);

  // computed
  const { codeTree, nodesToExpand } = useMemo(() => {
    if (projectCodes.data) {
      // build the tree
      const codeTree = new Tree().parse<ICodeTree>(codesToTree(projectCodes.data));
      const results = filterTree({ dataTree: codeTree, dataFilter: codeFilter });
      return { codeTree: results.dataTree as Node<ICodeTree>, nodesToExpand: results.nodesToExpand };
    } else {
      return { codeTree: null, nodesToExpand: new Set<number>() };
    }
  }, [projectCodes.data, codeFilter]);

  // effects
  // automatically expand filtered nodes
  useEffect(() => {
    expandCodes(Array.from(nodesToExpand).map((id) => id.toString()));
  }, [expandCodes, nodesToExpand]);

  // ui event handlers
  const handleExpandClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    expandCodes([nodeId]);
  };
  const handleCollapseClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    event.stopPropagation();
    const id = expandedCodeIds.indexOf(nodeId);
    const newCodeIds = [...expandedCodeIds];
    newCodeIds.splice(id, 1);
    setExpandedCodeIds(newCodeIds);
  };
  const onCreateCodeSuccess = (code: CodeRead, isNewCode: boolean) => {
    // if we add a new code successfully, we want to show the code in the code explorer
    // this means, we have to expand the parent codes, so the new code is visible
    const codesToExpand = [];
    let parentCodeId = code.parent_code_id;
    while (parentCodeId) {
      let currentParentCodeId = parentCodeId;

      codesToExpand.push(parentCodeId);
      parentCodeId = projectCodes.data?.find((code) => code.id === currentParentCodeId)?.parent_code_id;
    }
    expandCodes(codesToExpand.map((id) => id.toString()));
  };

  return (
    <Box display="flex" className="myFlexContainer h100">
      <Toolbar variant="dense" style={{ paddingRight: "8px" }} className="myFlexFitContentContainer">
        <Typography variant="h6" color="inherit" component="div">
          Filter codes
        </Typography>
        <TextField
          sx={{ ml: 1, flex: 1 }}
          placeholder={"type name here..."}
          variant="outlined"
          size="small"
          value={codeFilter}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setCodeFilter(event.target.value);
          }}
        />
        <CodeToggleEnabledButton code={codeTree?.model} />
      </Toolbar>
      <Divider />

      {projectCodes.isLoading && <CardContent>Loading project codes...</CardContent>}
      {projectCodes.isError && (
        <CardContent>An error occurred while loading project codes for project {project.id}...</CardContent>
      )}
      <List disablePadding>
        <ListItem disablePadding>
          <ListItemButton sx={{ px: 1.5 }} onClick={() => openCodeCreateDialog({ onSuccess: onCreateCodeSuccess })}>
            <ListItemIcon>
              <AddIcon />
            </ListItemIcon>
            <ListItemText primary="Create new code" />
          </ListItemButton>
        </ListItem>
      </List>
      <CodeCreateDialog />
      {projectCodes.isSuccess && codeTree && (
        <>
          <CodeTreeView
            className="myFlexFillAllContainer"
            data={codeTree.model}
            multiSelect={false}
            disableSelection
            expanded={expandedCodeIds}
            onExpandClick={handleExpandClick}
            onCollapseClick={handleCollapseClick}
            renderActions={(node) => (
              <>
                <CodeToggleVisibilityButton code={node} />
                <CodeEditButton code={node.data} />
                <CodeToggleEnabledButton code={node} />
              </>
            )}
          />
          <CodeEditDialog codes={projectCodes.data} />
        </>
      )}
    </Box>
  );
}

export default ProjectCodes;
