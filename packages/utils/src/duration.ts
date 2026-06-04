export function formatDuration(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) {
    return '00:00';
  }

  const total = Math.floor(seconds);
  
  const h = Math.floor(total / 3600);
  
  const m = Math.floor((total % 3600) / 60);
  
  const s = total % 60;
  
  const pad = (n: number): string => n.toString().padStart(2, '0');
  
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function elapsedSeconds(start: Date | string): number {
  const startMs = typeof start === 'string' ? new Date(start).getTime() : start.getTime();

  return Math.max(0, (Date.now() - startMs) / 1000);
}
