'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import { ReactRenderer } from '@tiptap/react';
import type { SuggestionOptions } from '@tiptap/suggestion';

import { UserAvatar } from '@open-meet/ui/user-avatar';
import { cn } from '@open-meet/ui/cn';

export interface MentionItem {
  id: string;
  label: string;
  avatar: string | null;
}

export interface MentionListHandle {
  onKeyDown: (event: ReactKeyboardEvent | KeyboardEvent) => boolean;
}

const MentionList = forwardRef<
  MentionListHandle,
  { items: MentionItem[]; command: (item: { id: string; label: string }) => void }
>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setSelected(0);
  }, [items]);

  const pick = (index: number) => {
    const item = items[index];
    if (item) {
      command({ id: item.id, label: item.label });
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) {
        return false;
      }
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        pick(selected);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="max-h-56 w-56 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
      {items.map((item, index) => (
        <li key={item.id}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              pick(index);
            }}
            className={cn(
              'flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-sm',
              index === selected ? 'bg-muted' : 'hover:bg-muted',
            )}
          >
            <UserAvatar user={{ name: item.label, avatar: item.avatar }} size="xs" />
            <span className="truncate">{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
});
MentionList.displayName = 'MentionList';

export function createMentionSuggestion(
  getItems: () => MentionItem[],
): Omit<SuggestionOptions<MentionItem>, 'editor'> {
  return {
    char: '@',
    items: ({ query }) =>
      getItems()
        .filter((m) => m.label.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6),
    render: () => {
      let component: ReactRenderer<MentionListHandle> | null = null;
      let popup: HTMLElement | null = null;

      const place = (rect: (() => DOMRect | null) | null | undefined) => {
        const box = rect?.();
        if (popup && box) {
          popup.style.left = `${box.left}px`;
          popup.style.top = `${box.bottom + 4}px`;
        }
      };

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, { props, editor: props.editor });
          popup = document.createElement('div');
          popup.style.position = 'fixed';
          popup.style.zIndex = '60';
          popup.appendChild(component.element);
          document.body.appendChild(popup);
          place(props.clientRect);
        },
        onUpdate: (props) => {
          component?.updateProps(props);
          place(props.clientRect);
        },
        onKeyDown: (props) => {
          if (props.event.key === 'Escape') {
            popup?.remove();
            return true;
          }
          return component?.ref?.onKeyDown(props.event) ?? false;
        },
        onExit: () => {
          popup?.remove();
          popup = null;
          component?.destroy();
          component = null;
        },
      };
    },
  };
}
