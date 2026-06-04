export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export type ByteSize =
  | { unit: 'B'; bytes: number }
  | { unit: 'KB'; kb: string }
  | { unit: 'MB'; mb: string };

export function byteSize(bytes: number): ByteSize {
  if (bytes < 1024) {
    return { unit: 'B', bytes };
  }

  if (bytes < 1024 * 1024) {
    return { unit: 'KB', kb: (bytes / 1024).toFixed(0) };
  }

  return { unit: 'MB', mb: (bytes / (1024 * 1024)).toFixed(1) };
}

export function previewText(content: string): string {
  return content
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '🖼')
    .replace(/\[@([^\]]+)\]\([^)]+\)/g, '@$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim();
}
