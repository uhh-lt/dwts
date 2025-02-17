import { useMemo } from "react";
import Tree, { Node } from "ts-tree-structure";
import TagHooks from "../../../api/TagHooks.ts";
import { IDataTree } from "../../TreeExplorer/IDataTree.ts";
import { dataToTree } from "../../TreeExplorer/TreeUtils.ts";

const useComputeTagTree = () => {
  // global server state
  const allTags = TagHooks.useGetAllTags();

  // computed
  const tagTree: Node<IDataTree> | null = useMemo(() => {
    if (allTags.data) {
      const tree = new Tree();
      return tree.parse<IDataTree>(dataToTree(allTags.data));
    } else {
      return null;
    }
  }, [allTags.data]);

  return { tagTree, allTags };
};

export default useComputeTagTree;
