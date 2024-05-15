import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { ICodeTree } from "./ICodeTree.ts";

export function codesToTree(codes: CodeRead[]): ICodeTree {
  // map input to ICodeTree
  const newCodes: ICodeTree[] = codes.map((code) => {
    return { data: code };
  });

  // create a dummy root node that will hold the results
  const dummyRootNode: CodeRead = {
    created: "",
    description: "This is the root node",
    name: "root",
    project_id: -1,
    updated: "",
    user_id: -1,
    id: -1,
    color: "",
    parent_id: undefined,
  };
  // create children of the new root node (all nodes that have no parent!)
  const children = newCodes.filter((codeTree) => !codeTree.data.parent_id);
  const root: ICodeTree = { data: dummyRootNode, children: children };

  // create the full tree using the other nodes
  const nodes = newCodes.filter((codeTree) => codeTree.data.parent_id);

  root.children!.forEach((codeTree) => {
    codesToTreeRecursion(codeTree, nodes);
  });

  return root;
}

function codesToTreeRecursion(root: ICodeTree, nodes: ICodeTree[]): ICodeTree {
  root.children = nodes.filter((node) => node.data.parent_id === root.data.id);
  const otherNodes = nodes.filter((node) => node.data.parent_id !== root.data.id);

  root.children.forEach((codeTree) => {
    codesToTreeRecursion(codeTree, otherNodes);
  });

  return root;
}

export function flatTreeWithRoot(tree: ICodeTree | null): CodeRead[] {
  if (!tree) {
    return [];
  }

  const allChildren = flatTree(tree);
  return [tree.data, ...allChildren];
}

export function flatTree(tree: ICodeTree | null): CodeRead[] {
  let result: CodeRead[] = [];
  if (tree && tree.children) {
    result = [...tree.children.map((value) => value.data), ...result];
    tree.children.forEach((value) => {
      result = [...result, ...flatTree(value)];
    });
  }
  return result;
}
