'use client';

import { useEffect, useState } from 'react';

export interface RowSelection {
  selected: Set<string>;
  isAllSelected: boolean;
  toggleAll: () => void;
  toggleOne: (id: string) => void;
  clear: () => void;
}

/** Row selection state for the datagrid. Clears whenever `resetKey` changes (page/search/filter/sort). */
export function useRowSelection(visibleIds: string[], resetKey: string): RowSelection {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [resetKey]);

  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleAll = () => setSelected(isAllSelected ? new Set() : new Set(visibleIds));

  const toggleOne = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });

  const clear = () => setSelected(new Set());

  return { selected, isAllSelected, toggleAll, toggleOne, clear };
}
