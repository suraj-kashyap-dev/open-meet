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

export interface ReadRangeOptions {
  start: number;
  end: number;
}

export interface ReadRangeResult {
  stream: Readable;
  size: number;
  totalSize: number;
  start: number;
  end: number;
  mime: string;
}

export interface StorageProvider {
  put(input: PutInput): Promise<PutResult>;
  publicUrl(key: string): string;
  read(key: string): Promise<ReadResult | null>;
  readRange(key: string, options: ReadRangeOptions): Promise<ReadRangeResult | null>;
  delete(key: string): Promise<void>;
}
