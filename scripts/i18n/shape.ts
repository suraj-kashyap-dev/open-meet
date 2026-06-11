export type EntryKind = 'object' | 'value';

export interface Entry {
  path: string;
  kind: EntryKind;
}

type JsonObject = { [key: string]: unknown };

const isPlainObject = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function flatten(value: JsonObject, prefix = ''): Entry[] {
  const entries: Entry[] = [];

  for (const key of Object.keys(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const child = value[key];

    if (isPlainObject(child)) {
      entries.push({ path, kind: 'object' });

      entries.push(...flatten(child, path));
    } else {
      entries.push({ path, kind: 'value' });
    }
  }

  return entries;
}

const indent = (text: string): string =>
  text
    .split('\n')
    .map((line) => `          ${line}`)
    .join('\n');

export function diffShapes(base: Entry[], target: Entry[], baseLocale: string): string[] {
  const problems: string[] = [];
  const baseKind = new Map(base.map((entry) => [entry.path, entry.kind]));
  const targetKind = new Map(target.map((entry) => [entry.path, entry.kind]));

  const missing = base.filter((entry) => !targetKind.has(entry.path)).map((entry) => entry.path);
  const extra = target.filter((entry) => !baseKind.has(entry.path)).map((entry) => entry.path);
  const reshaped = base
    .filter((entry) => targetKind.has(entry.path) && targetKind.get(entry.path) !== entry.kind)
    .map(
      (entry) =>
        `${entry.path}  (${baseLocale}: ${entry.kind}, here: ${targetKind.get(entry.path)})`,
    );

  if (missing.length) {
    problems.push(
      `missing ${missing.length} key(s) present in "${baseLocale}":\n${indent(missing.join('\n'))}`,
    );
  }

  if (extra.length) {
    problems.push(
      `${extra.length} extra key(s) not present in "${baseLocale}":\n${indent(extra.join('\n'))}`,
    );
  }

  if (reshaped.length) {
    problems.push(
      `${reshaped.length} key(s) with a different shape (object vs value):\n${indent(reshaped.join('\n'))}`,
    );
  }

  if (!missing.length && !extra.length && !reshaped.length) {
    for (let i = 0; i < base.length; i += 1) {
      if (base[i]!.path !== target[i]!.path) {
        problems.push(
          `key order differs at position ${i + 1}: "${baseLocale}" has "${base[i]!.path}", here is "${target[i]!.path}"`,
        );
        break;
      }
    }
  }

  return problems;
}
