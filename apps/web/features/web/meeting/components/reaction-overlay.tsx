'use client';

import { AnimatePresence, motion } from 'motion/react';
import { memo, useMemo } from 'react';

import { Twemoji } from '@/components/shared/twemoji';
import { useChatStore } from '@/features/web/meeting/stores';

const FLOAT_DURATION_S = 4.2;

export function ReactionOverlay() {
  const reactions = useChatStore((s) => s.reactions);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <FloatingEmoji key={r.id} id={r.id} emoji={r.emoji} name={r.name} />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface FloatingEmojiProps {
  id: string;
  emoji: string;
  name: string;
}

const FloatingEmoji = memo(function FloatingEmoji({ id, emoji, name }: FloatingEmojiProps) {
  const { leftPct, drift, rotate, swayDelay } = useMemo(() => positionFromId(id), [id]);

  return (
    <motion.div
      className="absolute bottom-24 flex flex-col items-center gap-1.5"
      style={{
        left: `${leftPct}%`,
        x: '-50%',
        willChange: 'transform, opacity',
      }}
      initial={{ y: 60, opacity: 0, scale: 0.4 }}
      animate={{
        y: -480,
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1, 1, 0.85],
        rotate: [0, rotate, -rotate, rotate / 2, 0],
      }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.3 } }}
      transition={{
        duration: FLOAT_DURATION_S,
        ease: 'easeOut',
        opacity: { times: [0, 0.12, 0.75, 1], duration: FLOAT_DURATION_S },
        scale: { times: [0, 0.15, 0.85, 1], duration: FLOAT_DURATION_S },
        rotate: {
          duration: FLOAT_DURATION_S,
          ease: 'easeInOut',
          times: [0, 0.25, 0.5, 0.75, 1],
        },
      }}
    >
      <motion.div
        style={{ willChange: 'transform' }}
        animate={{ x: [0, drift, -drift / 2, drift / 3, 0] }}
        transition={{
          duration: FLOAT_DURATION_S,
          ease: 'easeInOut',
          delay: swayDelay,
        }}
      >
        <Twemoji
          emoji={emoji}
          size={56}
          className="h-14 w-14 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
        />
      </motion.div>

      <motion.span
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: [0, 1, 1, 0], y: [4, 0, 0, -4] }}
        transition={{ duration: 1.6, ease: 'easeOut', times: [0, 0.2, 0.7, 1] }}
        className="whitespace-nowrap rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium text-foreground/90 shadow-sm backdrop-blur"
      >
        {name}
      </motion.span>
    </motion.div>
  );
});

function positionFromId(id: string): {
  leftPct: number;
  drift: number;
  rotate: number;
  swayDelay: number;
} {
  let hash = 0;

  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }

  const abs = Math.abs(hash);

  return {
    leftPct: 14 + (abs % 73),
    drift: 18 + ((abs >> 4) % 32) * (hash % 2 === 0 ? 1 : -1),
    rotate: 6 + ((abs >> 8) % 14) * (hash % 3 === 0 ? -1 : 1),
    swayDelay: ((abs >> 12) % 6) * 0.05,
  };
}
