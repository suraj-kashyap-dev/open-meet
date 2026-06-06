'use client';

import { Bold, Code, Italic, Link2, List, Quote } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';

import { Button } from '@open-meet/ui/button';

interface Wrap {
  before: string;
  after?: string;
  line?: boolean;
}

const BUTTONS = [
  { key: 'bold', icon: Bold, wrap: { before: '**', after: '**' } },
  { key: 'italic', icon: Italic, wrap: { before: '_', after: '_' } },
  { key: 'code', icon: Code, wrap: { before: '`', after: '`' } },
  { key: 'link', icon: Link2, wrap: { before: '[', after: '](url)' } },
  { key: 'list', icon: List, wrap: { before: '- ', line: true } },
  { key: 'quote', icon: Quote, wrap: { before: '> ', line: true } },
] as const satisfies ReadonlyArray<{ key: string; icon: typeof Bold; wrap: Wrap }>;

export function MarkdownToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string, caret: number) => void;
}) {
  const t = useTranslations('chat');

  const apply = (w: Wrap) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const after = w.after ?? w.before;

    const insert = w.line ? `${w.before}${selected}` : `${w.before}${selected}${after}`;
    const caret = w.line
      ? start + w.before.length + selected.length
      : selected
        ? start + insert.length
        : start + w.before.length;

    onChange(value.slice(0, start) + insert + value.slice(end), caret);

    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="flex items-center gap-0.5 px-3 pt-2">
      {BUTTONS.map((b) => (
        <Button
          key={b.key}
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          aria-label={t(`composer.md-${b.key}`)}
          title={t(`composer.md-${b.key}`)}
          onClick={() => apply(b.wrap)}
        >
          <b.icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}
