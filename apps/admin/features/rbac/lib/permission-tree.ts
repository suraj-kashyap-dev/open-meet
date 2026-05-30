import type { PermissionCatalogNodeDto } from '@open-meet/types';

export function collectLeaves(node: PermissionCatalogNodeDto): string[] {
  if (node.children.length === 0) {
    return [node.key];
  }

  return node.children.flatMap(collectLeaves);
}

export type NodeCheckState = 'checked' | 'partial' | 'unchecked';

export function nodeState(
  node: PermissionCatalogNodeDto,
  granted: ReadonlySet<string>,
): NodeCheckState {
  const leaves = collectLeaves(node);

  let checked = 0;

  for (const leaf of leaves) {
    if (granted.has(leaf)) {
      checked++;
    }
  }

  if (checked === 0) {
    return 'unchecked';
  }

  if (checked === leaves.length) {
    return 'checked';
  }

  return 'partial';
}

export function toggleNode(
  node: PermissionCatalogNodeDto,
  current: readonly string[],
): string[] {
  const leaves = new Set(collectLeaves(node));

  const granted = new Set(current);

  const state = nodeState(node, granted);

  if (state === 'checked') {
    for (const leaf of leaves) {
      granted.delete(leaf);
    }
  } else {
    for (const leaf of leaves) {
      granted.add(leaf);
    }
  }

  return Array.from(granted).sort();
}
