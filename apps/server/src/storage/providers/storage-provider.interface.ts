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
  /**
   * Persist a file and return the URL clients should use to fetch it.
   * For S3 this is a direct (or CDN-proxied) URL; for local it points at
   * the authenticated /api/uploads/files route.
   */
  put(input: PutInput): Promise<PutResult>;

  /**
   * Stream a previously stored object back. Only the local provider needs
   * this — the S3 provider exposes its objects directly via URL.
   */
  read(key: string): Promise<ReadResult | null>;

  delete(key: string): Promise<void>;
}
