'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';

import { useChatStore } from '@/store/client';

export function ReactionOverlay() {
  const reactions = useChatStore((s) => s.reactions);
  const clearReaction = useChatStore((s) => s.clearReaction);

  useEffect(() => {
    if (reactions.length === 0) {
      return;
    }
    const timers = reactions.map((r) =>
      window.setTimeout(() => {
        clearReaction(r.id);
      }, 3000),
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [reactions, clearReaction]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 flex flex-wrap items-end justify-center gap-3">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 20, scale: 0.7 }}
            animate={{ opacity: 1, y: -40, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.6 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-sm shadow-lg backdrop-blur"
          >
            <span className="text-2xl">{r.emoji}</span>
            <span className="text-xs text-muted-foreground">{r.name}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
