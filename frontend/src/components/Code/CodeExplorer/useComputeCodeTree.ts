import { useMemo } from "react";
import Tree, { Node } from "ts-tree-structure";
import CodeHooks from "../../../api/CodeHooks.ts";
import { IDataTree } from "../../TreeExplorer/IDataTree.ts";
import { dataToTree } from "../../TreeExplorer/TreeUtils.ts";

const useComputeCodeTree = () => {
  // global server state
  const allCodes = CodeHooks.useGetEnabledCodes();

  // computed
  const codeTree: Node<IDataTree> | null = useMemo(() => {
    if (allCodes.data) {
      const tree = new Tree();
      return tree.parse<IDataTree>(dataToTree(allCodes.data));
    } else {
      return null;
    }
  }, [allCodes.data]);

  return { codeTree, allCodes };
};

export default useComputeCodeTree;
