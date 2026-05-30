/** Localized clock time (HH:MM) for a message timestamp. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Splits a byte count into a unit + value. The threshold math is shared; each
 * caller maps the result onto its own i18n keys (the meeting and chat features
 * keep their unit strings in different namespaces).
 */
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

/**
 * Strips message markdown into a single-line preview safe for the conversation
 * list (and any other "one-liner" view). Mentions encoded as `[@name](userId)`
 * collapse to `@name`; embedded GIFs / image markdown to a short label; other
 * inline markdown characters are left as-is so the preview still reads.
 */
export function previewText(content: string): string {
  return content
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '🖼') // image / gif markdown
    .replace(/\[@([^\]]+)\]\([^)]+\)/g, '@$1') // mention chip
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // any other link
    .replace(/[`*_~]/g, '') // strip basic inline markers
    .trim();
}
