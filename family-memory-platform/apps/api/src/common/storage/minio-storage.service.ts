import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

export type MinioClient = {
  presignedPutObject: (bucket: string, objectName: string, expiry: number) => Promise<string>;
  presignedGetObject: (bucket: string, objectName: string, expiry: number) => Promise<string>;
  putObject: (
    bucket: string,
    objectName: string,
    stream: Buffer | string,
    size?: number,
    metaData?: Record<string, string>,
  ) => Promise<void>;
  listBuckets: () => Promise<Array<{ name: string }>>;
  bucketExists: (bucket: string) => Promise<boolean>;
};

@Injectable()
export class MinioStorageService {
  constructor(private readonly config: ConfigService) {}

  get mediaBucket() {
    return this.config.get<string>('MINIO_BUCKET_MEDIA') ?? 'family-media';
  }

  get documentsBucket() {
    return this.config.get<string>('MINIO_BUCKET_DOCUMENTS') ?? 'family-documents';
  }

  get dnaBucket() {
    return this.config.get<string>('MINIO_BUCKET_DNA') ?? 'family-dna';
  }

  createClient(): MinioClient {
    const accessKey = this.config.get<string>('MINIO_ROOT_USER');
    const secretKey = this.config.get<string>('MINIO_ROOT_PASSWORD');

    if (!accessKey || !secretKey) {
      throw new ServiceUnavailableException('MinIO credentials are not configured');
    }

    const require = createRequire(__filename);
    const minio = require('minio') as {
      Client: new (options: {
        endPoint: string;
        port: number;
        useSSL: boolean;
        accessKey: string;
        secretKey: string;
      }) => MinioClient;
    };

    return new minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost',
      port: Number(this.config.get<string>('MINIO_PORT') ?? 9000),
      useSSL: this.config.get<string>('MINIO_USE_SSL') === 'true',
      accessKey,
      secretKey,
    });
  }

  buildObjectKey(prefix: 'uploads' | 'documents' | 'dna', fileName: string) {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const datePrefix = new Date().toISOString().slice(0, 10);
    return `${prefix}/${datePrefix}/${randomUUID()}-${safeFileName}`;
  }

  async uploadBuffer(bucket: string, objectKey: string, buffer: Buffer, contentType = 'application/octet-stream') {
    const client = this.createClient();
    await client.putObject(bucket, objectKey, buffer, buffer.length, { 'Content-Type': contentType });
    return objectKey;
  }

  async presignedDownload(bucket: string, objectKey: string, expirySeconds: number) {
    const client = this.createClient();
    return client.presignedGetObject(bucket, objectKey, expirySeconds);
  }

  async checkHealth(): Promise<{
    ok: boolean;
    endpoint: string;
    port: number;
    mediaBucket: string;
    documentsBucket: string;
    dnaBucket: string;
    mediaBucketExists?: boolean;
    documentsBucketExists?: boolean;
    dnaBucketExists?: boolean;
    error?: string;
  }> {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost';
    const port = Number(this.config.get<string>('MINIO_PORT') ?? 9000);
    const mediaBucket = this.mediaBucket;
    const documentsBucket = this.documentsBucket;
    const dnaBucket = this.dnaBucket;

    try {
      const client = this.createClient();
      await client.listBuckets();
      const [mediaBucketExists, documentsBucketExists, dnaBucketExists] = await Promise.all([
        client.bucketExists(mediaBucket),
        client.bucketExists(documentsBucket),
        client.bucketExists(dnaBucket),
      ]);

      return {
        ok: mediaBucketExists && documentsBucketExists && dnaBucketExists,
        endpoint,
        port,
        mediaBucket,
        documentsBucket,
        dnaBucket,
        mediaBucketExists,
        documentsBucketExists,
        dnaBucketExists,
      };
    } catch (error) {
      return {
        ok: false,
        endpoint,
        port,
        mediaBucket,
        documentsBucket,
        dnaBucket,
        error: error instanceof Error ? error.message : 'MinIO unreachable',
      };
    }
  }
}
