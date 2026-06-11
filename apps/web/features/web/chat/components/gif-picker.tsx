'use client';

import { Film, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Input } from '@open-meet/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@open-meet/ui/popover';

import { useGifs } from '../hooks/use-chat';

export function GifPicker({ onPick }: { onPick: (url: string) => void }) {
  const t = useTranslations('chat');
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { data } = useGifs(q, open);

  const items = data?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t('gif.button')}
        className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
      >
        <Film className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <div className="relative mb-2">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('gif.search')}
            className="ps-9"
          />
        </div>
        <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="col-span-2 py-6 text-center text-xs text-muted-foreground">
              {t('gif.empty')}
            </p>
          ) : (
            items.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  onPick(g.url);

                  setOpen(false);
                }}
                className="overflow-hidden rounded"
              >
                <img src={g.previewUrl} alt="" className="h-24 w-full object-cover" />
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
