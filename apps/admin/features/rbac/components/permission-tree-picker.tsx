'use client';

import { ChevronDown, ChevronRight, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import type { PermissionCatalogNodeDto } from '@open-meet/types';
import { cn } from '@open-meet/ui/cn';

import { collectLeaves, nodeState, toggleNode } from '@/features/rbac/lib/permission-tree';

interface Props {
  tree: PermissionCatalogNodeDto[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function PermissionTreePicker({ tree, value, onChange, disabled = false }: Props) {
  const granted = new Set(value);
  return (
    <ul className="space-y-1 rounded-md border border-border bg-card/40 p-2">
      {tree.map((node) => (
        <Node
          key={node.key}
          node={node}
          granted={granted}
          onToggle={(n) => onChange(toggleNode(n, value))}
          disabled={disabled}
          depth={0}
        />
      ))}
    </ul>
  );
}

function Node({
  node,
  granted,
  onToggle,
  disabled,
  depth,
}: {
  node: PermissionCatalogNodeDto;
  granted: ReadonlySet<string>;
  onToggle: (n: PermissionCatalogNodeDto) => void;
  disabled: boolean;
  depth: number;
}) {
  const t = useTranslations();
  const hasChildren = node.children.length > 0;
  // Auto-open top-level group; collapse deeper nodes by default.
  const [open, setOpen] = useState(depth === 0);
  const state = nodeState(node, granted);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = state === 'partial';
  }, [state]);

  const label = safeT(t, node.labelKey, node.key.split('.').pop() ?? node.key);

  return (
    <li>
      <div
        className={cn(
          'group flex items-center gap-2 rounded px-2 py-1.5 text-sm',
          state === 'checked' ? 'bg-accent/10' : 'hover:bg-muted/60',
        )}
        style={{ paddingInlineStart: `${depth * 0.75 + 0.5}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse' : 'Expand'}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
            )}
          </button>
        ) : (
          <span className="h-5 w-5" />
        )}

        <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
          <span className="relative inline-flex h-4 w-4 items-center justify-center">
            <input
              ref={inputRef}
              type="checkbox"
              className={cn(
                'peer h-4 w-4 cursor-pointer rounded border border-border bg-background',
                'checked:bg-accent checked:border-accent',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
              checked={state === 'checked'}
              disabled={disabled}
              onChange={() => onToggle(node)}
            />
            {state === 'partial' ? (
              <Minus className="pointer-events-none absolute h-3 w-3 text-accent" />
            ) : null}
          </span>
          <span className={cn('truncate', state === 'unchecked' && 'text-muted-foreground')}>
            {label}
          </span>
          {hasChildren ? (
            <span className="ms-auto text-[10px] uppercase tracking-wider text-muted-foreground">
              {collectLeaves(node).filter((k) => granted.has(k)).length}/{collectLeaves(node).length}
            </span>
          ) : null}
        </label>
      </div>

      {hasChildren && open ? (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <Node
              key={child.key}
              node={child}
              granted={granted}
              onToggle={onToggle}
              disabled={disabled}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

// next-intl throws if a key is missing; we want graceful fallback to the last
// dot-segment so newly-added permissions render even before their translation lands.
function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
  try {
    return t(key);
  } catch {
    return fallback;
  }
}
