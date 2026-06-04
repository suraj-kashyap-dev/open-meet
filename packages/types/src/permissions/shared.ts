/**
 * Shared permission-catalog types and helpers.
 *
 * A permission catalog is a nested object literal whose **leaves** (`null` values)
 * are individual permission keys. Parents exist only as grouping nodes in the UI.
 * Storage is flat: roles persist their granted *leaves*, never parents.
 * The picker expands a parent click into all descendant leaves at submit time.
 */

export type PermissionTreeNode = { readonly [key: string]: PermissionTreeNode | null };

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;

/** Recursive literal-union of every leaf key in a `as const` tree. */
export type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends null
    ? Join<P, K>
    : T[K] extends Record<string, unknown>
      ? Leaves<T[K], Join<P, K>>
      : never;
}[keyof T & string];

/** Flatten the tree into a sorted array of leaf dot-keys. */
export function flattenLeaves(tree: PermissionTreeNode, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(tree)) {
    const full = prefix === '' ? k : `${prefix}.${k}`;
    if (v === null) out.push(full);
    else out.push(...flattenLeaves(v, full));
  }
  return out;
}

/** Return the set of leaf keys under `key` (inclusive). If `key` is already a leaf, returns `[key]`. */
export function leavesUnder(key: string, tree: PermissionTreeNode): string[] {
  const all = flattenLeaves(tree);
  if (all.includes(key)) return [key];
  const prefix = `${key}.`;
  return all.filter((leaf) => leaf.startsWith(prefix));
}

/**
 * Expand a mixed list of leaf-or-parent keys into a deduped, sorted array of leaves only.
 * Unknown keys are dropped silently - callers are expected to validate against the catalog.
 */
export function expandToLeaves(selected: readonly string[], tree: PermissionTreeNode): string[] {
  const all = new Set(flattenLeaves(tree));
  const result = new Set<string>();
  for (const key of selected) {
    if (all.has(key)) {
      result.add(key);
      continue;
    }
    const prefix = `${key}.`;
    for (const leaf of all) if (leaf.startsWith(prefix)) result.add(leaf);
  }
  return Array.from(result).sort();
}

/**
 * Reject any value in `selected` that does not match a leaf or a parent path in the catalog.
 * Returns the list of unknown keys (empty if everything is valid).
 */
export function unknownKeys(selected: readonly string[], tree: PermissionTreeNode): string[] {
  const leaves = flattenLeaves(tree);
  const validParents = new Set<string>();
  for (const leaf of leaves) {
    const parts = leaf.split('.');
    for (let i = 1; i < parts.length; i++) validParents.add(parts.slice(0, i).join('.'));
  }
  const validLeaves = new Set(leaves);
  return selected.filter((k) => !validLeaves.has(k) && !validParents.has(k));
}

export interface PermissionCatalogNodeDto {
  /** Full dot-key, e.g. `groups.manage-members`. */
  key: string;
  /** Translated label fetched via i18n; key form e.g. `rbac.permissions.groups.manage-members`. */
  labelKey: string;
  /** Empty array on leaves. */
  children: PermissionCatalogNodeDto[];
}

/**
 * Build the catalog DTO returned by `/api/admin/permissions/{catalog,user-catalog}`.
 * `labelPrefix` is the i18n namespace prefix (e.g. `'rbac.permissions'`).
 *
 * Parent nodes (groups) get the suffix `._self` on their labelKey because the
 * nested-object i18n JSON uses string values only at leaves and `_self` slots
 * for groups (e.g. `permissions.users._self = "Users"`).
 */
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
