import { readFile, writeFile } from 'node:fs/promises';

import YAML from 'yaml';

import { LIVEKIT_YAML } from './paths.js';

export async function updateLivekitYaml(apiKey: string, apiSecret: string): Promise<void> {
  const content = await readFile(LIVEKIT_YAML, 'utf8');
  const doc = YAML.parseDocument(content);

  doc.set('keys', { [apiKey]: apiSecret });

  await writeFile(LIVEKIT_YAML, doc.toString());
}
