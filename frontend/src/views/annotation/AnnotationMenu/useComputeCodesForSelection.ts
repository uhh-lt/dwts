import { useMemo } from "react";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import useComputeCodeTree from "../../../components/Code/CodeExplorer/useComputeCodeTree.ts";
import { flatTreeWithRoot } from "../../../components/TreeExplorer/TreeUtils.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";

export const useComputeCodesForSelection = () => {
  // global server state
  const { codeTree, allCodes } = useComputeCodeTree();

  // global client state
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const mostRecentCode = useAppSelector((state) => state.annotations.mostRecentCode);

  // computed
  const codesForSelection = useMemo(() => {
    type CodeWithLevel = { data: CodeRead; level: number };
    let codesForSelection: CodeWithLevel[] = [];

    if (!selectedCodeId) {
      // if no code is selected, return all codes with level 0
      codesForSelection = (allCodes.data || []).map((code) => ({ data: code, level: 0 }));
    } else {
      // if a code is selected, return itself and its children with levels
      const parentCode = codeTree?.first((node) => node.model.data.id === selectedCodeId);
      if (!parentCode) {
        return [];
      }
      codesForSelection = flatTreeWithRoot(parentCode.model) as CodeWithLevel[];
    }

    // add the most recent code to the top of the list
    const idx = codesForSelection.findIndex((t) => t.data.id === mostRecentCode?.id);
    if (idx !== -1) {
      const code = codesForSelection[idx];
      codesForSelection.splice(idx, 1);
      codesForSelection.unshift(code);
    }

    return codesForSelection;
  }, [allCodes, codeTree, mostRecentCode, selectedCodeId]);

  return codesForSelection;
};
