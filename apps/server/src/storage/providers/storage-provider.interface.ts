import type { Readable } from 'node:stream';

export interface PutInput {
  key: string;
  buffer: Buffer;
  mime: string;
}

export interface PutResult {
  url: string;
}

export interface ReadResult {
  stream: Readable;
  size: number;
  mime: string;
}

export interface StorageProvider {
  put(input: PutInput): Promise<PutResult>;
  publicUrl(key: string): string;
  read(key: string): Promise<ReadResult | null>;
  delete(key: string): Promise<void>;
}
