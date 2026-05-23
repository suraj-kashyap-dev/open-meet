import { readFile, writeFile } from 'node:fs/promises';

import YAML from 'yaml';

import { EGRESS_YAML } from './paths.js';

export async function updateEgressYaml(apiKey: string, apiSecret: string): Promise<void> {
  const content = await readFile(EGRESS_YAML, 'utf8');
  const doc = YAML.parseDocument(content);

  doc.set('api_key', apiKey);
  doc.set('api_secret', apiSecret);

  await writeFile(EGRESS_YAML, doc.toString());
}
