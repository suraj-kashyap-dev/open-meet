'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/cn';

interface Props {
  emoji: string;
  className?: string;
  size?: number;
}

function toTwemojiCodepoint(emoji: string): string {
  return [...emoji]
    .map((c) => c.codePointAt(0)!.toString(16).toLowerCase())
    .filter((cp) => cp !== 'fe0f')
    .join('-');
}

export function Twemoji({ emoji, className, size = 20 }: Props) {
  const codepoint = useMemo(() => toTwemojiCodepoint(emoji), [emoji]);

  const src = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@14.0.2/assets/svg/${codepoint}.svg`;

  return (
    <img
      src={src}
      alt={emoji}
      role="img"
      draggable={false}
      width={size}
      height={size}
      className={cn('inline-block select-none', className)}
    />
  );
}
