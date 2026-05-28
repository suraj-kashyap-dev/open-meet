'use client';

import dynamic from 'next/dynamic';
import { Smile } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@open-meet/ui/popover';

const EmojiPicker = dynamic(() => import('emoji-picker-react').then((m) => m.default), {
  ssr: false,
});

export function ReactionPicker({
  onPick,
  trigger,
  align = 'start',
}: {
  onPick: (emoji: string) => void;
  trigger?: ReactNode;
  align?: 'start' | 'center' | 'end';
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Smile className="h-4 w-4" />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent align={align} className="w-auto border-0 p-0 shadow-lg">
        <EmojiPicker
          onEmojiClick={(data: { emoji: string }) => {
            onPick(data.emoji);
            setOpen(false);
          }}
          lazyLoadEmojis
        />
      </PopoverContent>
    </Popover>
  );
}
