'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { PermissionCatalogNodeDto } from '@open-meet/types';
import { Checkbox } from '@open-meet/ui/checkbox';
import { cn } from '@open-meet/ui/cn';

import { collectLeaves, nodeState, toggleNode } from '@/features/rbac/lib/permission-tree';

interface Props {
  tree: PermissionCatalogNodeDto[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

function gatherGroupKeys(nodes: readonly PermissionCatalogNodeDto[]): string[] {
  return nodes.flatMap((n) =>
    n.children.length > 0 ? [n.key, ...gatherGroupKeys(n.children)] : [],
  );
}

export function PermissionTreePicker({ tree, value, onChange, disabled = false }: Props) {
  const t = useTranslations('rbac');
  const granted = new Set(value);

  const allLeaves = useMemo(() => tree.flatMap(collectLeaves), [tree]);
  const allGroupKeys = useMemo(() => gatherGroupKeys(tree), [tree]);
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(tree.map((n) => n.key)));

  const selectedCount = allLeaves.filter((k) => granted.has(k)).length;
  const allSelected = selectedCount === allLeaves.length && allLeaves.length > 0;

  const setOpen = (key: string, open: boolean) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);

      if (open) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t('permissions.selected-count', { count: selectedCount, total: allLeaves.length })}
        </span>
        <div className="flex items-center gap-0.5 text-xs">
          <ToolbarButton onClick={() => setOpenKeys(new Set(allGroupKeys))}>
            {t('permissions.expand-all')}
          </ToolbarButton>
          <ToolbarButton onClick={() => setOpenKeys(new Set())}>
            {t('permissions.collapse-all')}
          </ToolbarButton>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <ToolbarButton
            disabled={disabled || allSelected}
            onClick={() => onChange([...allLeaves].sort())}
          >
            {t('permissions.select-all')}
          </ToolbarButton>
          <ToolbarButton disabled={disabled || selectedCount === 0} onClick={() => onChange([])}>
            {t('permissions.clear')}
          </ToolbarButton>
        </div>
      </div>

      <ul className="w-full space-y-0.5 rounded-xl border border-border bg-card/40 p-2">
        {tree.map((node) => (
          <TreeNode
            key={node.key}
            node={node}
            granted={granted}
            value={value}
            onChange={onChange}
            disabled={disabled}
            isOpen={(k) => openKeys.has(k)}
            setOpen={setOpen}
          />
        ))}
      </ul>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-md px-2 py-1 font-medium text-muted-foreground transition-colors',
        'hover:bg-muted hover:text-foreground',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      {children}
    </button>
  );
}

function TreeNode({
  node,
  granted,
  value,
  onChange,
  disabled,
  isOpen,
  setOpen,
  isChild = false,
  isLast = false,
}: {
  node: PermissionCatalogNodeDto;
  granted: ReadonlySet<string>;
  value: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
  isOpen: (key: string) => boolean;
  setOpen: (key: string, open: boolean) => void;
  isChild?: boolean;
  isLast?: boolean;
}) {
  const t = useTranslations();
  const hasChildren = node.children.length > 0;
  const open = isOpen(node.key);
  const state = nodeState(node, granted);
  const checkedState = state === 'partial' ? 'indeterminate' : state === 'checked';
  const label = safeT(t, node.labelKey, node.key.split('.').pop() ?? node.key);

  const leaves = hasChildren ? collectLeaves(node) : [];
  const grantedLeaves = leaves.filter((k) => granted.has(k)).length;

  return (
    <li
      className={cn(
        'relative',
        isChild &&
          "before:absolute before:start-0 before:top-0 before:h-4 before:w-3 before:rounded-es-[7px] before:border-b before:border-s before:border-border before:content-['']",
        isChild &&
          !isLast &&
          "after:absolute after:start-0 after:top-4 after:bottom-0 after:border-s after:border-border after:content-['']",
      )}
    >
      <div
        className={cn(
          'group flex w-full items-center gap-2 rounded-lg py-1.5 text-sm transition-colors hover:bg-muted/60',
          isChild ? 'ps-3.5 pe-2' : 'px-2',
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen(node.key, !open)}
            aria-label={open ? 'Collapse' : 'Expand'}
            aria-expanded={open}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight
              className={cn('h-4 w-4 transition-transform rtl:-scale-x-100', open && 'rotate-90')}
            />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden />
        )}

        <Checkbox
          checked={checkedState}
          disabled={disabled}
          aria-label={label}
          onCheckedChange={() => onChange(toggleNode(node, value))}
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => onChange(toggleNode(node, value))}
          className="flex flex-1 items-center gap-2 truncate text-start disabled:cursor-not-allowed"
        >
          <span
            className={cn(
              'truncate',
              hasChildren && 'font-medium',
              state === 'checked' && !hasChildren && 'font-medium text-foreground',
              state === 'unchecked' && !hasChildren && 'text-muted-foreground',
            )}
          >
            {label}
          </span>
          {hasChildren ? (
            <span
              className={cn(
                'ms-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums',
                grantedLeaves === 0 ? 'bg-muted text-muted-foreground' : 'bg-accent/15 text-accent',
              )}
            >
              {grantedLeaves}/{leaves.length}
            </span>
          ) : null}
        </button>
      </div>

      {hasChildren && open ? (
        <ul className="ms-[1.125rem] space-y-0.5">
          {node.children.map((child, i) => (
            <TreeNode
              key={child.key}
              node={child}
              granted={granted}
              value={value}
              onChange={onChange}
              disabled={disabled}
              isOpen={isOpen}
              setOpen={setOpen}
              isChild
              isLast={i === node.children.length - 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
  try {
    return t(key);
  } catch {
    return fallback;
  }
}
