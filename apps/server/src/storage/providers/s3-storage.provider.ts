import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';

import type {
  PutInput,
  PutResult,
  ReadResult,
  StorageProvider,
} from './storage-provider.interface';

export interface S3StorageOptions {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
  publicUrl?: string;
}

export class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);

  private readonly client: S3Client;

  private readonly bucket: string;

  private readonly publicUrlBase: string;

  constructor(private readonly options: S3StorageOptions) {
    this.bucket = options.bucket;

    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle ?? false,
      credentials:
        options.accessKeyId && options.secretAccessKey
          ? {
              accessKeyId: options.accessKeyId,
              secretAccessKey: options.secretAccessKey,
            }
          : undefined,
    });

    if (options.publicUrl) {
      this.publicUrlBase = options.publicUrl.replace(/\/$/, '');
    } else if (options.endpoint) {
      this.publicUrlBase = `${options.endpoint.replace(/\/$/, '')}/${options.bucket}`;
    } else {
      this.publicUrlBase = `https://${options.bucket}.s3.${options.region}.amazonaws.com`;
    }
  }

  publicUrl(key: string): string {
    return `${this.publicUrlBase}/${key}`;
  }

  async put({ key, buffer, mime }: PutInput): Promise<PutResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
        ACL: 'public-read',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    this.logger.debug(`Uploaded ${buffer.length} bytes to s3://${this.bucket}/${key}`);
    return { url: `${this.publicUrlBase}/${key}` };
  }

  read(): Promise<ReadResult | null> {
    return Promise.resolve(null);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
