import { cloneDeep } from "lodash";
import { Node } from "ts-tree-structure";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { IDataTree } from "./IDataTree.ts";

interface FilterProps {
  dataTree: Node<IDataTree>;
  dataFilter: string;
}

export function dataToTree(data: (DocumentTagRead | CodeRead)[]): IDataTree {
  // map input to IDataTree
  const newData: IDataTree[] = data.map((subset) => {
    return { data: subset };
  });

  // create a dummy root node that will hold the results
  const dummyRootNode: DocumentTagRead | CodeRead = {
    created: "",
    description: "This is the root node",
    name: "root",
    project_id: -1,
    updated: "",
    id: -1,
    color: "",
    parent_id: undefined,
  };
  // create children of the new root node (all nodes that have no parent!)
  const children = newData.filter((dataTree) => !dataTree.data.parent_id);
  const root: IDataTree = { data: dummyRootNode, children: children };

  // create the full tree using the other nodes
  const nodes: IDataTree[] = newData.filter((dataTree) => dataTree.data.parent_id);

  root.children!.forEach((tagTree) => {
    dataToTreeRecursion(tagTree, nodes);
  });

  return root;
}

function dataToTreeRecursion(root: IDataTree, nodes: IDataTree[]): IDataTree {
  const otherNodes = nodes.filter((node) => node.data.parent_id !== root.data.id);
  root.children = nodes.filter((node) => node.data.parent_id === root.data.id);

  root.children.forEach((dataTree) => {
    dataToTreeRecursion(dataTree, otherNodes);
  });

  return root;
}

export function flatTreeWithRoot(tree: IDataTree | null): { data: DocumentTagRead | CodeRead; level: number }[] {
  if (!tree) {
    return [];
  }

  const result: { data: DocumentTagRead | CodeRead; level: number }[] = [];

  function traverse(node: IDataTree, level: number) {
    result.push({ data: node.data, level });
    if (node.children) {
      node.children.forEach((child) => traverse(child, level + 1));
    }
  }

  traverse(tree, 0);
  return result;
}

export function flatTree(tree: IDataTree | null): (DocumentTagRead | CodeRead)[] {
  let result: (DocumentTagRead | CodeRead)[] = [];
  if (tree && tree.children) {
    result = [...tree.children.map((value) => value.data), ...result];
    tree.children.forEach((value) => {
      result = [...result, ...flatTree(value)];
    });
  }
  return result;
}

export function filterTree({ dataTree, dataFilter }: FilterProps) {
  const nodesToExpand = new Set<number>();

  // clone tree using lodash
  let dataTreeCopy = cloneDeep(dataTree);

  if (dataFilter.trim().length > 0) {
    const nodesToKeep = new Set<number>();

    // find all nodes that match the filter
    dataTreeCopy.walk(
      (node) => {
        const data = node.model.data;
        if (data.name.startsWith(dataFilter.trim())) {
          // keep the node
          nodesToKeep.add(data.id);

          // keep its children
          node.children.map((child) => child.model.data.id).forEach((id) => nodesToKeep.add(id));

          // keep its parents
          let parent = node.parent;
          while (parent) {
            nodesToKeep.add(parent.model.data.id);
            nodesToExpand.add(parent.model.data.id);
            parent = parent.parent;
          }
        }
        return true;
      },
      { strategy: "breadth" },
    );

    // filter the dataTree
    const nodes_to_remove = (dataTreeCopy as Node<IDataTree>).all((node) => !nodesToKeep.has(node.model.data.id));

    nodes_to_remove.forEach((node) => {
      node.drop();
    });
    dataTreeCopy = dataTreeCopy as Node<IDataTree>;
  } else {
    dataTreeCopy = dataTree;
  }
  return { dataTree: dataTreeCopy, nodesToExpand };
}
