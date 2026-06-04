import ts from 'typescript';
import { readFileSync, writeFileSync } from 'node:fs';

// Comments the toolchain reads — never strip these.
const DIRECTIVE =
  /@ts-(expect-error|ignore|nocheck|check)|eslint-(disable|enable)|prettier-ignore|stylelint-(disable|enable)|biome-ignore|webpack(ChunkName|Mode|Prefetch|Preload|Include|Exclude|Ignore)|@vite-ignore|@rollup|@__PURE__|#__PURE__|@preserve|@license|istanbul ignore|[cv]8 ignore|@jsx|@jsxImportSource|^\/?\s*<reference|noinspection/;

const isDirective = (commentText) => DIRECTIVE.test(commentText);

function rangesToRemove(text, comments) {
  const removals = [];
  for (const { pos, end } of comments) {
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    const beforeIsBlank = text.slice(lineStart, pos).trim() === '';

    let lineEnd = text.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = text.length;
    const afterIsBlank = text.slice(end, lineEnd).trim() === '';

    if (beforeIsBlank && afterIsBlank) {
      // Whole-line (or whole block on its own lines): drop the lines + newline.
      const to = lineEnd < text.length ? lineEnd + 1 : lineEnd;
      removals.push([lineStart, to]);
    } else if (afterIsBlank) {
      // Trailing comment after code: also eat the whitespace before it.
      let from = pos;
      while (from > lineStart && (text[from - 1] === ' ' || text[from - 1] === '\t')) from--;
      removals.push([from, end]);
    } else {
      // Inline comment with code after it on the same line.
      removals.push([pos, end]);
    }
  }
  return removals;
}

function scriptKindFor(file) {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (file.endsWith('.jsx') || file.endsWith('.mjs') || file.endsWith('.cjs') || file.endsWith('.js'))
    return ts.ScriptKind.JSX;
  return ts.ScriptKind.TS;
}

function stripTsLike(text, file) {
  // Parse the file so regex literals / templates are real tokens; comments only
  // ever live in the trivia gaps between tokens, which getCommentRanges scans
  // safely. A standalone scanner can't tell `/.../` from `//` without this.
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKindFor(file));
  const seen = new Set();
  const comments = [];
  const add = (ranges) => {
    if (!ranges) return;
    for (const c of ranges) {
      const key = `${c.pos}:${c.end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!isDirective(text.slice(c.pos, c.end))) comments.push({ pos: c.pos, end: c.end });
    }
  };

  const visit = (node) => {
    for (const child of node.getChildren(sf)) {
      add(ts.getLeadingCommentRanges(text, child.getFullStart()));
      visit(child);
    }
    add(ts.getTrailingCommentRanges(text, node.getEnd()));
  };
  visit(sf);

  if (!comments.length) return text;

  const removals = rangesToRemove(text, comments).sort((a, b) => b[0] - a[0]);
  let out = text;
  for (const [from, to] of removals) out = out.slice(0, from) + out.slice(to);
  return out;
}

function stripCss(text) {
  const comments = [];
  let inStr = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      if (!isDirective(text.slice(i, stop))) comments.push({ pos: i, end: stop });
      i = stop - 1;
    }
  }
  if (!comments.length) return text;
  const removals = rangesToRemove(text, comments).sort((a, b) => b[0] - a[0]);
  let out = text;
  for (const [from, to] of removals) out = out.slice(0, from) + out.slice(to);
  return out;
}

let changed = 0;
for (const file of process.argv.slice(2)) {
  if (file.endsWith('next-env.d.ts')) continue;
  const text = readFileSync(file, 'utf8');
  const isCss = file.endsWith('.css');
  const next = isCss ? stripCss(text) : stripTsLike(text, file);
  if (next !== text) {
    writeFileSync(file, next);
    changed++;
  }
}
console.log(`stripped comments in ${changed} file(s)`);
