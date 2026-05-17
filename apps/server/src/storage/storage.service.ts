import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApiEnv } from '@open-meet/config';

import { LocalStorageProvider } from './providers/local-storage.provider';
import type {
  PutInput,
  PutResult,
  ReadRangeOptions,
  ReadRangeResult,
  ReadResult,
  StorageProvider,
} from './providers/storage-provider.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  private readonly provider: StorageProvider;

  constructor(config: ConfigService<ApiEnv, true>) {
    const rootDir = config.getOrThrow<string>('LOCAL_STORAGE_DIR');

    this.provider = new LocalStorageProvider(rootDir, config.getOrThrow<string>('API_PUBLIC_URL'));
    this.logger.log(`Storage: local dir="${rootDir}"`);
  }

  put(input: PutInput): Promise<PutResult> {
    return this.provider.put(input);
  }

  publicUrl(key: string): string {
    return this.provider.publicUrl(key);
  }

  read(key: string): Promise<ReadResult | null> {
    return this.provider.read(key);
  }

  readRange(key: string, options: ReadRangeOptions): Promise<ReadRangeResult | null> {
    return this.provider.readRange(key, options);
  }

  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }
}
