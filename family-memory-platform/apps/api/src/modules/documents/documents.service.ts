import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  type CreateDocumentUploadUrlDto,
} from './documents-upload.dto';
import type { CreateDocumentDto, UpdateDocumentDto } from './documents.dto';

@Injectable()
export class DocumentsService {
  private readonly bucket: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
  ) {
    this.bucket = this.config.get<string>('MINIO_BUCKET_DOCUMENTS') ?? 'family-documents';
  }

  findAll() {
    return this.prisma.document.findMany({
      where: { deletedAt: null },
      include: { person: true, media: true, source: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: { person: true, media: true, source: true },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  /** Short-lived GET URL for viewers (Document Intelligence, PDF embed). */
  async getPresignedDownloadUrl(id: string) {
    await this.ensureExists(id);
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      select: { storageKey: true, bucket: true, mimeType: true, title: true },
    });
    if (!document) throw new NotFoundException('Document not found');
    const client = this.createMinioClient();
    const bucket = document.bucket || this.bucket;
    const downloadUrl = await client.presignedGetObject(bucket, document.storageKey, 15 * 60);
    return {
      documentId: id,
      downloadUrl,
      mimeType: document.mimeType,
      title: document.title,
      expiresInSeconds: 15 * 60,
    };
  }

  async createUploadUrl(dto: CreateDocumentUploadUrlDto) {
    this.assertAllowedFile(dto.mimeType, dto.sizeBytes);
    const storageKey = this.buildStorageKey(dto.fileName);
    const client = this.createMinioClient();
    const uploadUrl = await client.presignedPutObject(this.bucket, storageKey, 15 * 60);
    return {
      bucket: this.bucket,
      storageKey,
      uploadUrl,
      expiresInSeconds: 15 * 60,
      maxSizeBytes: MAX_DOCUMENT_FILE_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
    };
  }

  async create(dto: CreateDocumentDto) {
    if (dto.personId) {
      await this.ensurePersonExists(dto.personId);
    }
    const document = await this.prisma.document.create({
      data: {
        ...dto,
        bucket: dto.bucket || this.bucket,
      },
    });
    await this.indexDocument(document.id);
    return document;
  }

  async update(id: string, dto: UpdateDocumentDto) {
    await this.ensureExists(id);
    const document = await this.prisma.document.update({ where: { id }, data: dto });
    await this.indexDocument(document.id);
    return document;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async ensureExists(id: string) {
    const document = await this.prisma.document.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!document) throw new NotFoundException('Document not found');
  }

  private async ensurePersonExists(personId: string) {
    const person = await this.prisma.person.findFirst({ where: { id: personId, deletedAt: null }, select: { id: true } });
    if (!person) {
      throw new NotFoundException('Person not found');
    }
  }

  private assertAllowedFile(mimeType: string, sizeBytes: number) {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
      throw new BadRequestException(`Unsupported MIME type: ${mimeType}`);
    }
    if (sizeBytes > MAX_DOCUMENT_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File is too large. Max size is ${MAX_DOCUMENT_FILE_SIZE_BYTES} bytes`);
    }
  }

  private buildStorageKey(fileName: string) {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const datePrefix = new Date().toISOString().slice(0, 10);
    return `documents/${datePrefix}/${randomUUID()}-${safeFileName}`;
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

  private async indexDocument(documentId: string) {
    try {
      await this.search.indexDocument(documentId);
    } catch {
      // Search indexing must not block core CRUD writes.
    }
  }
}
