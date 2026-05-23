'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@open-meet/ui/cn';

interface Props {
  stream: MediaStream | null;
  active: boolean;
  className?: string;
}

const BAR_COUNT = 5;

export function AudioMeter({ stream, active, className }: Props) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !active) {
      setLevel(0);

      return;
    }

    const track = stream.getAudioTracks()[0];

    if (!track) {
      return;
    }

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(buf);

      let sum = 0;

      for (let i = 0; i < buf.length; i++) {
        sum += buf[i]!;
      }

      const avg = sum / buf.length / 255;

      setLevel((prev) => prev * 0.6 + avg * 0.4);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      source.disconnect();

      void ctx.close();
    };
  }, [stream, active]);

  const lit = Math.min(BAR_COUNT, Math.ceil(level * BAR_COUNT * 2.2));

  return (
    <div
      className={cn('flex items-end gap-0.5', className)}
      aria-label="Microphone level"
      role="meter"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const isOn = active && i < lit;
        const h = 4 + i * 3;
        return (
          <span
            key={i}
            className={cn(
              'w-1 rounded-full transition-colors duration-100',
              isOn ? 'bg-success' : 'bg-white/30',
            )}
            style={{ height: `${h}px` }}
          />
        );
      })}
    </div>
  );
}
