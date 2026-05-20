import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_MEDIA_FILE_SIZE_BYTES,
  type CreateMediaMetadataDto,
  type CreateUploadUrlDto,
  type LinkMediaDto,
} from './media.dto';

@Injectable()
export class MediaService {
  private readonly bucket: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.bucket = this.config.get<string>('MINIO_BUCKET_MEDIA') ?? 'family-media';
  }

  async findAll() {
    return this.prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createUploadUrl(dto: CreateUploadUrlDto) {
    this.assertAllowedFile(dto.mimeType, dto.sizeBytes);

    const storageKey = this.buildStorageKey(dto.fileName);
    const client = this.createMinioClient();
    const uploadUrl = await client.presignedPutObject(this.bucket, storageKey, 15 * 60);

    return {
      bucket: this.bucket,
      storageKey,
      uploadUrl,
      expiresInSeconds: 15 * 60,
      maxSizeBytes: MAX_MEDIA_FILE_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_MEDIA_MIME_TYPES,
    };
  }

  async createMetadata(dto: CreateMediaMetadataDto) {
    this.assertAllowedFile(dto.mimeType, dto.sizeBytes);

    if (dto.personId) {
      await this.ensurePersonExists(dto.personId);
    }

    return this.prisma.media.create({
      data: {
        title: dto.title ?? dto.fileName,
        mimeType: dto.mimeType,
        storageKey: dto.storageKey,
        bucket: this.bucket,
        sizeBytes: dto.sizeBytes,
        personId: dto.personId,
      },
    });
  }

  async createDownloadUrl(mediaId: string) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new NotFoundException('Media file not found');
    }

    const client = this.createMinioClient();
    const downloadUrl = await client.presignedGetObject(media.bucket, media.storageKey, 10 * 60);

    return {
      mediaId: media.id,
      bucket: media.bucket,
      storageKey: media.storageKey,
      downloadUrl,
      expiresInSeconds: 10 * 60,
    };
  }

  async linkMedia(mediaId: string, dto: LinkMediaDto) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new NotFoundException('Media file not found');
    }

    if (dto.entityType === 'person') {
      await this.ensurePersonExists(dto.entityId);
      return this.prisma.media.update({
        where: { id: mediaId },
        data: { personId: dto.entityId },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'media.link',
        entityType: dto.entityType,
        entityId: dto.entityId,
        payload: {
          mediaId,
          bucket: media.bucket,
          storageKey: media.storageKey,
        },
      },
    });

    return {
      mediaId,
      linked: true,
      entityType: dto.entityType,
      entityId: dto.entityId,
      persistence: 'auditLog',
    };
  }

  private assertAllowedFile(mimeType: string, sizeBytes: number) {
    if (!ALLOWED_MEDIA_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MEDIA_MIME_TYPES)[number])) {
      throw new BadRequestException(`Unsupported MIME type: ${mimeType}`);
    }

    if (sizeBytes > MAX_MEDIA_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File is too large. Max size is ${MAX_MEDIA_FILE_SIZE_BYTES} bytes`);
    }
  }

  private async ensurePersonExists(personId: string) {
    const person = await this.prisma.person.findUnique({ where: { id: personId }, select: { id: true } });
    if (!person) {
      throw new NotFoundException('Person not found');
    }
  }

  private buildStorageKey(fileName: string) {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const datePrefix = new Date().toISOString().slice(0, 10);
    return `uploads/${datePrefix}/${randomUUID()}-${safeFileName}`;
  }

  private createMinioClient() {
    const require = createRequire(__filename);
    const minio = require('minio') as {
      Client: new (options: {
        endPoint: string;
        port: number;
        useSSL: boolean;
        accessKey: string;
        secretKey: string;
      }) => {
        presignedPutObject: (bucket: string, objectName: string, expiry: number) => Promise<string>;
        presignedGetObject: (bucket: string, objectName: string, expiry: number) => Promise<string>;
      };
    };

    const accessKey = this.config.get<string>('MINIO_ROOT_USER');
    const secretKey = this.config.get<string>('MINIO_ROOT_PASSWORD');

    if (!accessKey || !secretKey) {
      throw new ServiceUnavailableException('MinIO credentials are not configured');
    }

    return new minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost',
      port: Number(this.config.get<string>('MINIO_PORT') ?? 9000),
      useSSL: this.config.get<string>('MINIO_USE_SSL') === 'true',
      accessKey,
      secretKey,
    });
  }
}
