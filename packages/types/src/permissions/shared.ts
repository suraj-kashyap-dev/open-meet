export type PermissionTreeNode = { readonly [key: string]: PermissionTreeNode | null };

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;

export type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends null
    ? Join<P, K>
    : T[K] extends Record<string, unknown>
      ? Leaves<T[K], Join<P, K>>
      : never;
}[keyof T & string];

export function flattenLeaves(tree: PermissionTreeNode, prefix = ''): string[] {
  const out: string[] = [];

  for (const [k, v] of Object.entries(tree)) {
    const full = prefix === '' ? k : `${prefix}.${k}`;

    if (v === null) {
      out.push(full);
    } else {
      out.push(...flattenLeaves(v, full));
    }
  }

  return out;
}

export function leavesUnder(key: string, tree: PermissionTreeNode): string[] {
  const all = flattenLeaves(tree);

  if (all.includes(key)) {
    return [key];
  }

  const prefix = `${key}.`;

  return all.filter((leaf) => leaf.startsWith(prefix));
}

export function expandToLeaves(selected: readonly string[], tree: PermissionTreeNode): string[] {
  const all = new Set(flattenLeaves(tree));
  const result = new Set<string>();

  for (const key of selected) {
    if (all.has(key)) {
      result.add(key);
      continue;
    }

    const prefix = `${key}.`;

    for (const leaf of all) {
      if (leaf.startsWith(prefix)) {
        result.add(leaf);
      }
    }
  }

  return Array.from(result).sort();
}

export function unknownKeys(selected: readonly string[], tree: PermissionTreeNode): string[] {
  const leaves = flattenLeaves(tree);
  const validParents = new Set<string>();

  for (const leaf of leaves) {
    const parts = leaf.split('.');

    for (let i = 1; i < parts.length; i++) {
      validParents.add(parts.slice(0, i).join('.'));
    }
  }

  const validLeaves = new Set(leaves);

  return selected.filter((k) => !validLeaves.has(k) && !validParents.has(k));
}

export interface PermissionCatalogNodeDto {
  key: string;
  labelKey: string;
  children: PermissionCatalogNodeDto[];
}

export function buildCatalogTree(
  tree: PermissionTreeNode,
  labelPrefix: string,
  prefix = '',
): PermissionCatalogNodeDto[] {
  return Object.entries(tree).map(([k, v]) => {
    const fullKey = prefix === '' ? k : `${prefix}.${k}`;
    const isLeaf = v === null;
    const labelKey = isLeaf ? `${labelPrefix}.${fullKey}` : `${labelPrefix}.${fullKey}._self`;

    return {
      key: fullKey,
      labelKey,
      children: isLeaf ? [] : buildCatalogTree(v, labelPrefix, fullKey),
    };
  });
}
