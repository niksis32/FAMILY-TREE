import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  COMMUNITY_GRAPHQL_DEFAULT_RATE_LIMIT,
  COMMUNITY_SPAM_HTTP_POST_LIMIT_DEFAULT,
  COMMUNITY_SPAM_HTTP_THREAD_LIMIT_DEFAULT,
} from '@family/shared';
import { resolveRootEnvPath } from './config/load-root-env';
import { CommonInterceptorsModule } from './common/common-interceptors.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { MfaModule } from './modules/mfa/mfa.module';
import { CitationsModule } from './modules/citations/citations.module';
import { CommunityForumModule } from './modules/community-forum/community-forum.module';
import { CommunityGraphqlModule } from './modules/community-graphql/community-graphql.module';
import { CommunityGroupsModule } from './modules/community-groups/community-groups.module';
import { CommunityModerationModule } from './modules/community-moderation/community-moderation.module';
import { CommunityResearchModule } from './modules/community-research/community-research.module';
import { DocumentIntelligenceModule } from './modules/document-intelligence/document-intelligence.module';
import { DocumentOcrModule } from './modules/document-ocr/document-ocr.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EventsModule } from './modules/events/events.module';
import { FamiliesModule } from './modules/families/families.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { GedcomModule } from './modules/gedcom/gedcom.module';
import { MapModule } from './modules/map/map.module';
import { MatchingModule } from './modules/matching/matching.module';
import { FamilyStoriesModule } from './modules/family-stories/family-stories.module';
import { RedisModule } from './common/redis/redis.module';
import { FaceTagsModule } from './modules/face-tags/face-tags.module';
import { MediaModule } from './modules/media/media.module';
import { PersonPhotoLinksModule } from './modules/person-photo-links/person-photo-links.module';
import { PhotoAnalysisModule } from './modules/photo-analysis/photo-analysis.module';
import { PersonsModule } from './modules/persons/persons.module';
import { PlacesModule } from './modules/places/places.module';
import { RelationshipsModule } from './modules/relationships/relationships.module';
import { SearchModule } from './modules/search/search.module';
import { SourcesModule } from './modules/sources/sources.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { TreeModule } from './modules/tree/tree.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './common/health/health.module';
import { LoggingModule } from './common/logging/logging.module';
import { MinioStorageModule } from './common/storage/minio-storage.module';
import { StorytellingModule } from './modules/storytelling/storytelling.module';
import { CommercialModule } from './modules/commercial/commercial.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { WorkspaceExportModule } from './modules/workspace-export/workspace-export.module';

/**
 * Root application module — registers all MVP domain modules.
 * Iterative development: implement one module at a time (auth → persons → …).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveRootEnvPath(),
      expandVariables: true,
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
      { name: 'auth-login', ttl: 60_000, limit: 5 },
      {
        name: 'community-graphql',
        ttl: 60_000,
        limit: Number.parseInt(
          process.env.COMMUNITY_GRAPHQL_RATE_LIMIT ?? String(COMMUNITY_GRAPHQL_DEFAULT_RATE_LIMIT),
          10,
        ) || COMMUNITY_GRAPHQL_DEFAULT_RATE_LIMIT,
      },
      {
        name: 'community-forum-post',
        ttl: 60_000,
        limit: Number.parseInt(
          process.env.COMMUNITY_SPAM_HTTP_POST_LIMIT ?? String(COMMUNITY_SPAM_HTTP_POST_LIMIT_DEFAULT),
          10,
        ) || COMMUNITY_SPAM_HTTP_POST_LIMIT_DEFAULT,
      },
      {
        name: 'community-forum-thread',
        ttl: 60_000,
        limit: Number.parseInt(
          process.env.COMMUNITY_SPAM_HTTP_THREAD_LIMIT ?? String(COMMUNITY_SPAM_HTTP_THREAD_LIMIT_DEFAULT),
          10,
        ) || COMMUNITY_SPAM_HTTP_THREAD_LIMIT_DEFAULT,
      },
      { name: 'community-forum-helpful', ttl: 60_000, limit: 30 },
    ]),
    LoggingModule,
    CommonInterceptorsModule,
    PrismaModule,
    RedisModule,
    MinioStorageModule,
    HealthModule,
    AiModule,
    AuthModule,
    MfaModule,
    UsersModule,
    PersonsModule,
    FamiliesModule,
    RelationshipsModule,
    EventsModule,
    PlacesModule,
    PersonPhotoLinksModule,
    FaceTagsModule,
    MediaModule,
    PhotoAnalysisModule,
    DocumentsModule,
    DocumentIntelligenceModule,
    DocumentOcrModule,
    SourcesModule,
    CitationsModule,
    TimelineModule,
    TreeModule,
    MapModule,
    GamificationModule,
    SearchModule,
    GedcomModule,
    AdminModule,
    CommunityGroupsModule,
    CommunityForumModule,
    CommunityResearchModule,
    CommunityModerationModule,
    CommunityGraphqlModule,
    MatchingModule,
    FamilyStoriesModule,
    StorytellingModule,
    CommercialModule,
    PrivacyModule,
    WorkspaceExportModule,
  ],
})
export class AppModule {}
