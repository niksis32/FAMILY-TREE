import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { MinioStorageService } from '../../common/storage/minio-storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { workspaceScopedCreateData } from '../../prisma/workspace-scoped-create';
import { AssetPrivacyService } from '../privacy/asset-privacy.service';
import { WebhookDomainHooksService } from '../webhooks/webhook-domain-hooks.service';
import {
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_MEDIA_FILE_SIZE_BYTES,
  type CreateMediaMetadataDto,
  type CreateUploadUrlDto,
  type LinkMediaDto,
} from './media.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly minio: MinioStorageService,
    private readonly assetPrivacy: AssetPrivacyService,
    @Optional() private readonly webhookHooks?: WebhookDomainHooksService,
  ) {}

  async findAll(user?: AuthenticatedUser | null) {
    const rows = await this.prisma.media.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        workspaceId: true,
        privacyLevel: true,
        personId: true,
        title: true,
        mimeType: true,
        storageKey: true,
        bucket: true,
        sizeBytes: true,
        takenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return this.assetPrivacy.filterVisibleMedia(rows, user);
  }

  async findOne(id: string, user?: AuthenticatedUser | null) {
    await this.assetPrivacy.assertCanViewMedia(id, user);
    return this.prisma.media.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { faceTags: true, comments: true } },
      },
    });
  }

  async createUploadUrl(dto: CreateUploadUrlDto) {
    this.assertAllowedFile(dto.mimeType, dto.sizeBytes);

    const storageKey = this.minio.buildObjectKey('uploads', dto.fileName);
    const client = this.minio.createClient();
    const bucket = this.minio.mediaBucket;
    const uploadUrl = await client.presignedPutObject(bucket, storageKey, 15 * 60);

    return {
      bucket,
      storageKey,
      uploadUrl,
      expiresInSeconds: 15 * 60,
      maxSizeBytes: MAX_MEDIA_FILE_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_MEDIA_MIME_TYPES,
    };
  }

  async createMetadata(dto: CreateMediaMetadataDto, user?: AuthenticatedUser | null) {
    this.assertAllowedFile(dto.mimeType, dto.sizeBytes);

    if (dto.personId) {
      await this.ensurePersonExists(dto.personId);
    }

    const media = await this.prisma.media.create({
      data: workspaceScopedCreateData<Prisma.MediaUncheckedCreateInput>({
        title: dto.title ?? dto.fileName,
        mimeType: dto.mimeType,
        storageKey: dto.storageKey,
        bucket: this.minio.mediaBucket,
        sizeBytes: dto.sizeBytes,
        personId: dto.personId,
        privacyLevel: 'PRIVATE',
        links: dto.personId
          ? {
              create: {
                ownerType: 'PERSON',
                ownerId: dto.personId,
              },
            }
          : undefined,
      }),
    });

    await this.writeAudit(user, 'media.upload', media.id, {
      storageKey: media.storageKey,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
    });

    void this.webhookHooks?.onMediaUploaded({
      workspaceId: media.workspaceId,
      mediaId: media.id,
      title: media.title,
      mimeType: media.mimeType,
      personId: media.personId,
    });

    return media;
  }

  async createDownloadUrl(mediaId: string, user?: AuthenticatedUser | null, expiresInSeconds = 10 * 60) {
    const media = await this.assetPrivacy.assertCanViewMedia(mediaId, user);

    const client = this.minio.createClient();
    const downloadUrl = await client.presignedGetObject(
      media.bucket,
      media.storageKey,
      expiresInSeconds,
    );

    await this.writeAudit(user, 'media.download', mediaId, {
      storageKey: media.storageKey,
      expiresInSeconds,
    });

    return {
      mediaId: media.id,
      bucket: media.bucket,
      storageKey: media.storageKey,
      downloadUrl,
      expiresInSeconds,
    };
  }

  async remove(mediaId: string, user?: AuthenticatedUser | null) {
    const media = await this.assetPrivacy.assertCanViewMedia(mediaId, user);
    const updated = await this.prisma.media.update({
      where: { id: mediaId },
      data: { deletedAt: new Date() },
    });

    await this.writeAudit(user, 'media.delete', mediaId, {
      storageKey: media.storageKey,
    });

    return updated;
  }

  /**
   * Stable CDN URL when MEDIA_CDN_BASE_URL is set; otherwise long-lived presigned GET.
   * Used for public story covers and gallery assets (SEO / social crawlers).
   */
  async createPublicAssetUrl(mediaId: string, isPublicLink = true): Promise<string | null> {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, deletedAt: null },
      select: { id: true, bucket: true, storageKey: true },
    });
    if (!media) return null;

    try {
      await this.assetPrivacy.assertCanViewMedia(mediaId, null, isPublicLink);
    } catch {
      return null;
    }

    const cdnBase = this.config.get<string>('MEDIA_CDN_BASE_URL')?.replace(/\/$/, '');
    if (cdnBase) {
      const segments = [media.bucket, ...media.storageKey.split('/')]
        .map((s) => encodeURIComponent(s))
        .join('/');
      return `${cdnBase}/${segments}`;
    }

    const ttl = Number(this.config.get<string>('MEDIA_PUBLIC_ASSET_TTL_SEC') ?? 86400);
    const { downloadUrl } = await this.createDownloadUrl(mediaId, null, ttl);
    return downloadUrl;
  }

  async linkMedia(mediaId: string, dto: LinkMediaDto, user?: AuthenticatedUser | null) {
    await this.assetPrivacy.assertCanViewMedia(mediaId, user);
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, deletedAt: null },
      select: { id: true, bucket: true, storageKey: true },
    });
    if (!media) {
      throw new NotFoundException('Media file not found');
    }

    await this.ensureLinkTarget(dto.entityType, dto.entityId);

    if (dto.entityType === 'person') {
      return this.prisma.media.update({
        where: { id: mediaId },
        data: {
          personId: dto.entityId,
          links: {
            upsert: {
              where: {
                mediaId_ownerType_ownerId: {
                  mediaId,
                  ownerType: 'PERSON',
                  ownerId: dto.entityId,
                },
              },
              update: {},
              create: {
                ownerType: 'PERSON',
                ownerId: dto.entityId,
              },
            },
          },
        },
      });
    }

    const ownerType = toMediaOwnerType(dto.entityType);
    await this.prisma.mediaLink.upsert({
      where: {
        mediaId_ownerType_ownerId: {
          mediaId,
          ownerType,
          ownerId: dto.entityId,
        },
      },
      update: {},
      create: {
        mediaId,
        ownerType,
        ownerId: dto.entityId,
      },
    });

    await this.writeAudit(user, 'media.link', mediaId, {
      entityType: dto.entityType,
      entityId: dto.entityId,
      bucket: media.bucket,
      storageKey: media.storageKey,
    });

    return {
      mediaId,
      linked: true,
      entityType: dto.entityType,
      entityId: dto.entityId,
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
    const person = await this.prisma.person.findFirst({
      where: { id: personId, deletedAt: null },
      select: { id: true },
    });
    if (!person) {
      throw new NotFoundException('Person not found');
    }
  }

  private async ensureLinkTarget(entityType: LinkMediaDto['entityType'], entityId: string) {
    switch (entityType) {
      case 'person': {
        await this.ensurePersonExists(entityId);
        return;
      }
      case 'family': {
        const family = await this.prisma.family.findFirst({
          where: { id: entityId, deletedAt: null },
          select: { id: true },
        });
        if (!family) throw new NotFoundException('Family not found');
        return;
      }
      case 'event': {
        const event = await this.prisma.event.findFirst({
          where: { id: entityId, deletedAt: null },
          select: { id: true },
        });
        if (!event) throw new NotFoundException('Event not found');
        return;
      }
      case 'document': {
        const document = await this.prisma.document.findFirst({
          where: { id: entityId, deletedAt: null },
          select: { id: true },
        });
        if (!document) throw new NotFoundException('Document not found');
        return;
      }
      case 'source': {
        const source = await this.prisma.source.findFirst({
          where: { id: entityId, deletedAt: null },
          select: { id: true },
        });
        if (!source) throw new NotFoundException('Source not found');
        return;
      }
      case 'story': {
        const story = await this.prisma.familyStory.findFirst({
          where: { id: entityId },
          select: { id: true },
        });
        if (!story) throw new NotFoundException('Story not found');
        return;
      }
      case 'message': {
        const post = await this.prisma.forumPost.findFirst({
          where: { id: entityId, deletedAt: null },
          select: { id: true },
        });
        if (!post) throw new NotFoundException('Message not found');
        return;
      }
      default:
        throw new BadRequestException(`Unsupported entity type: ${entityType}`);
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
          entityType: 'media',
          entityId,
          payload,
        },
      });
    } catch {
      // Audit must not break primary flows.
    }
  }
}

function toMediaOwnerType(
  entityType: LinkMediaDto['entityType'],
): 'PERSON' | 'FAMILY' | 'EVENT' | 'DOCUMENT' | 'SOURCE' | 'STORY' | 'MESSAGE' {
  switch (entityType) {
    case 'family':
      return 'FAMILY';
    case 'event':
      return 'EVENT';
    case 'document':
      return 'DOCUMENT';
    case 'source':
      return 'SOURCE';
    case 'story':
      return 'STORY';
    case 'message':
      return 'MESSAGE';
    default:
      return 'PERSON';
  }
}
