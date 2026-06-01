import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BASE_LOCALE, LANG_ROOTS, REPO_ROOT } from './config';
import { diffShapes, flatten } from './shape';

function readJson(file: string): { data?: Record<string, unknown>; error?: string } {
  try {
    return { data: JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown> };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

const listNamespaces = (dir: string): string[] =>
  readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort();

const listLocales = (root: string): string[] =>
  readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

console.log(`\n🌐  Translation sync check - base locale: "${BASE_LOCALE}"\n`);

let filesChecked = 0;
let problemCount = 0;
let rootsChecked = 0;

for (const relRoot of LANG_ROOTS) {
  const root = join(REPO_ROOT, relRoot);

  if (!existsSync(root)) {
    console.log(`•  ${relRoot} - skipped (directory not found)\n`);
    continue;
  }

  rootsChecked += 1;
  console.log(relRoot);

  const locales = listLocales(root);

  if (!locales.includes(BASE_LOCALE)) {
    console.log(`  ✗  no "${BASE_LOCALE}" base directory found\n`);
    problemCount += 1;
    process.exitCode = 1;
    continue;
  }

  const baseDir = join(root, BASE_LOCALE);
  const baseNamespaces = listNamespaces(baseDir);
  const otherLocales = locales.filter((locale) => locale !== BASE_LOCALE);

  if (otherLocales.length === 0) {
    console.log(`  (only "${BASE_LOCALE}" present - nothing to compare)\n`);
    continue;
  }

  for (const locale of otherLocales) {
    const localeDir = join(root, locale);
    const localeNamespaces = listNamespaces(localeDir);

    for (const file of baseNamespaces.filter((f) => !localeNamespaces.includes(f))) {
      console.log(`  ✗  ${locale}/${file} - MISSING file (exists in "${BASE_LOCALE}")`);
      problemCount += 1;
      process.exitCode = 1;
    }

    for (const file of localeNamespaces.filter((f) => !baseNamespaces.includes(f))) {
      console.log(`  ✗  ${locale}/${file} - EXTRA file (no "${BASE_LOCALE}" counterpart)`);
      problemCount += 1;
      process.exitCode = 1;
    }

    for (const file of baseNamespaces.filter((f) => localeNamespaces.includes(f))) {
      filesChecked += 1;

      const base = readJson(join(baseDir, file));
      const target = readJson(join(localeDir, file));

      if (base.error) {
        console.log(`  ✗  ${BASE_LOCALE}/${file} - invalid JSON: ${base.error}`);
        problemCount += 1;
        process.exitCode = 1;
        continue;
      }
      if (target.error) {
        console.log(`  ✗  ${locale}/${file} - invalid JSON: ${target.error}`);
        problemCount += 1;
        process.exitCode = 1;
        continue;
      }

      const problems = diffShapes(flatten(base.data!), flatten(target.data!), BASE_LOCALE);

      if (problems.length === 0) {
        console.log(`  ✓  ${locale}/${file}`);
      } else {
        console.log(`  ✗  ${locale}/${file}`);
        for (const problem of problems) {
          console.log(`        · ${problem}`);
        }
        problemCount += problems.length;
        process.exitCode = 1;
      }
    }
  }

  console.log('');
}

if (process.exitCode === 1) {
  console.log(`✖  Translations are OUT OF SYNC - ${problemCount} problem(s) found.`);
  console.log(
    `   English ("${BASE_LOCALE}") is the source of truth: every other locale must have the same`,
  );
  console.log(
    `   namespace files, with identical keys, nesting, and key order. Fix the entries listed above.\n`,
  );
} else {
  console.log(
    `✔  In sync - ${filesChecked} translation file(s) across ${rootsChecked} ` +
      `director${rootsChecked === 1 ? 'y' : 'ies'} match the "${BASE_LOCALE}" base ` +
      `(files, keys, nesting, and order).\n`,
  );
}
