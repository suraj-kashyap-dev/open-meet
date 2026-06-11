'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';

import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Code, Italic, Link2, List, ListOrdered, Quote } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Editor } from '@tiptap/react';

import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';

import { tiptapToMarkdown } from '../lib/tiptap-markdown';
import { ReactionPicker } from './reaction-picker';
import { createMentionSuggestion, type MentionItem } from './rich-input-mention';

export interface RichInputHandle {
  insertText: (text: string) => void;
  clear: () => void;
  focus: () => void;
}

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn('h-7 w-7', active ? 'bg-muted text-foreground' : 'text-muted-foreground')}
    >
      {children}
    </Button>
  );
}

export const RichInput = forwardRef<
  RichInputHandle,
  {
    placeholder: string;
    getMentionItems: () => MentionItem[];
    onChange: (markdown: string) => void;
    onSubmit: () => void;
  }
>(({ placeholder, getMentionItems, onChange, onSubmit }, ref) => {
  const t = useTranslations('chat');
  const submitRef = useRef(onSubmit);

  submitRef.current = onSubmit;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: 'font-medium text-accent' },
        suggestion: createMentionSuggestion(getMentionItems),
        renderText: ({ node }) => `@${node.attrs.label as string}`,
      }),
    ],
    editorProps: {
      attributes: {
        class:
          'max-h-48 min-h-[2.25rem] overflow-y-auto px-3 py-2 text-sm leading-6 outline-none [&_p]:m-0',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();

          submitRef.current();

          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor: e }) => onChange(tiptapToMarkdown(e.getJSON())),
  });

  useImperativeHandle(
    ref,
    () => ({
      insertText: (text: string) => editor?.chain().focus().insertContent(text).run(),
      clear: () => editor?.commands.clearContent(true),
      focus: () => editor?.commands.focus(),
    }),
    [editor],
  );

  const run = (fn: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => {
    if (editor) {
      fn(editor.chain().focus()).run();
    }
  };

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor?.isActive(name, attrs) ?? false;

  return (
    <div className="w-full overflow-hidden rounded-md border border-border bg-input focus-within:ring-2 focus-within:ring-ring">
      <div className="flex items-center gap-0.5 border-b border-border/60 px-1.5 py-1">
        <ToolbarButton
          active={isActive('bold')}
          label={t('composer.md-bold')}
          onClick={() => run((c) => c.toggleBold())}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={isActive('italic')}
          label={t('composer.md-italic')}
          onClick={() => run((c) => c.toggleItalic())}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={isActive('code')}
          label={t('composer.md-code')}
          onClick={() => run((c) => c.toggleCode())}
        >
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={isActive('bulletList')}
          label={t('composer.md-list')}
          onClick={() => run((c) => c.toggleBulletList())}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={isActive('orderedList')}
          label={t('composer.md-list')}
          onClick={() => run((c) => c.toggleOrderedList())}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={isActive('blockquote')}
          label={t('composer.md-quote')}
          onClick={() => run((c) => c.toggleBlockquote())}
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={isActive('link')}
          label={t('composer.md-link')}
          onClick={() => {
            const href = window.prompt(t('composer.md-link')) ?? '';

            if (href) {
              run((c) => c.toggleLink({ href }));
            }
          }}
        >
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ReactionPicker align="start" onPick={(emoji) => run((c) => c.insertContent(emoji))} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});
RichInput.displayName = 'RichInput';
