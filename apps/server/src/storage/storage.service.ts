import { Injectable, Logger } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';

import type { ApiEnv } from '@open-meet/config';

import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import type {
  PutInput,
  PutResult,
  ReadResult,
  StorageProvider,
} from './providers/storage-provider.interface';

export type StorageProviderKind = 's3' | 'local';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  private readonly provider: StorageProvider;

  private readonly kind: StorageProviderKind;

  constructor(config: ConfigService<ApiEnv, true>) {
    const bucket = config.get<string>('S3_BUCKET');

    if (bucket && bucket.length > 0) {
      this.kind = 's3';
      this.provider = new S3StorageProvider({
        bucket,
        region: config.getOrThrow<string>('S3_REGION'),
        endpoint: config.get<string>('S3_ENDPOINT') || undefined,
        accessKeyId: config.get<string>('S3_ACCESS_KEY_ID') || undefined,
        secretAccessKey: config.get<string>('S3_SECRET_ACCESS_KEY') || undefined,
        publicUrl: config.get<string>('S3_PUBLIC_URL') || undefined,
        forcePathStyle: config.get<boolean>('S3_FORCE_PATH_STYLE') ?? false,
      });
      this.logger.log(`Storage: S3 bucket="${bucket}"`);
    } else {
      this.kind = 'local';
      this.provider = new LocalStorageProvider(
        config.getOrThrow<string>('LOCAL_STORAGE_DIR'),
        config.getOrThrow<string>('API_PUBLIC_URL'),
      );
      this.logger.log(
        `Storage: local dir="${config.getOrThrow<string>('LOCAL_STORAGE_DIR')}"`,
      );
    }
  }

  getKind(): StorageProviderKind {
    return this.kind;
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

  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }
}
