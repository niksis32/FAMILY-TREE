import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { MinioStorageService } from '../../common/storage/minio-storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { workspaceScopedCreateData } from '../../prisma/workspace-scoped-create';
import { AssetPrivacyService } from '../privacy/asset-privacy.service';
import { CollaborationHooksService } from '../collaboration/collaboration-hooks.service';
import { SearchService } from '../search/search.service';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  type CreateDocumentUploadUrlDto,
} from './documents-upload.dto';
import type { CreateDocumentDto, UpdateDocumentDto } from './documents.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly minio: MinioStorageService,
    private readonly prisma: PrismaService,
    private readonly search: SearchService,
    private readonly assetPrivacy: AssetPrivacyService,
    @Optional() private readonly collaborationHooks?: CollaborationHooksService,
  ) {}

  async findAll(user?: AuthenticatedUser | null) {
    const rows = await this.prisma.document.findMany({
      where: { deletedAt: null },
      include: { person: true, media: true, source: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return this.assetPrivacy.filterVisibleDocuments(
      rows.map((r) => ({
        ...r,
        workspaceId: r.workspaceId,
        privacyLevel: r.privacyLevel,
        personId: r.personId,
      })),
      user,
    );
  }

  async findOne(id: string, user?: AuthenticatedUser | null) {
    await this.assetPrivacy.assertCanViewDocument(id, user);
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: { person: true, media: true, source: true },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async getPresignedDownloadUrl(id: string, user?: AuthenticatedUser | null) {
    const document = await this.assetPrivacy.assertCanViewDocument(id, user);
    const client = this.minio.createClient();
    const bucket = document.bucket || this.minio.documentsBucket;
    const downloadUrl = await client.presignedGetObject(bucket, document.storageKey, 15 * 60);

    await this.writeAudit(user, 'document.download', id, {
      storageKey: document.storageKey,
      expiresInSeconds: 15 * 60,
    });

    return {
      documentId: id,
      downloadUrl,
      mimeType: document.mimeType ?? undefined,
      title: document.title ?? undefined,
      expiresInSeconds: 15 * 60,
    };
  }

  async createUploadUrl(dto: CreateDocumentUploadUrlDto) {
    this.assertAllowedFile(dto.mimeType, dto.sizeBytes);
    const storageKey = this.minio.buildObjectKey('documents', dto.fileName);
    const client = this.minio.createClient();
    const bucket = this.minio.documentsBucket;
    const uploadUrl = await client.presignedPutObject(bucket, storageKey, 15 * 60);
    return {
      bucket,
      storageKey,
      uploadUrl,
      expiresInSeconds: 15 * 60,
      maxSizeBytes: MAX_DOCUMENT_FILE_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
    };
  }

  async create(dto: CreateDocumentDto, user?: AuthenticatedUser | null) {
    if (dto.personId) {
      await this.ensurePersonExists(dto.personId);
    }
    const document = await this.prisma.document.create({
      data: workspaceScopedCreateData<Prisma.DocumentUncheckedCreateInput>({
        title: dto.title,
        documentType: dto.documentType,
        mimeType: dto.mimeType,
        storageKey: dto.storageKey,
        bucket: dto.bucket || this.minio.documentsBucket,
        personId: dto.personId,
        mediaId: dto.mediaId,
        sourceId: dto.sourceId,
        description: dto.description,
        ocrText: dto.ocrText,
        privacyLevel: 'FAMILY',
      }),
    });
    await this.indexDocument(document.id);
    await this.writeAudit(user, 'document.upload', document.id, {
      storageKey: document.storageKey,
      mimeType: document.mimeType,
    });

    if (user?.id && document.workspaceId) {
      void this.collaborationHooks?.onDocumentUploaded({
        workspaceId: document.workspaceId,
        actorUserId: user.id,
        documentId: document.id,
        title: document.title ?? 'Документ',
      });
    }

    return document;
  }

  async update(id: string, dto: UpdateDocumentDto, user?: AuthenticatedUser | null) {
    await this.assetPrivacy.assertCanViewDocument(id, user);
    const document = await this.prisma.document.update({ where: { id }, data: dto });
    await this.indexDocument(document.id);
    return document;
  }

  async remove(id: string, user?: AuthenticatedUser | null) {
    await this.assetPrivacy.assertCanViewDocument(id, user);
    const updated = await this.prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.writeAudit(user, 'document.delete', id, { storageKey: updated.storageKey });
    return updated;
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

  private async indexDocument(documentId: string) {
    try {
      await this.search.indexDocument(documentId);
    } catch {
      // Search indexing must not block core CRUD writes.
    }
  }

  private async writeAudit(
    user: AuthenticatedUser | null | undefined,
    action: string,
    entityId: string,
    payload: Prisma.InputJsonValue,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user?.id,
          action,
          entityType: 'document',
          entityId,
          payload,
        },
      });
    } catch {
      // Audit must not break primary flows.
    }
  }
}
