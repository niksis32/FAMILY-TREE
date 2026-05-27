import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CitationsModule } from './modules/citations/citations.module';
import { CommunityForumModule } from './modules/community-forum/community-forum.module';
import { CommunityGraphqlModule } from './modules/community-graphql/community-graphql.module';
import { CommunityGroupsModule } from './modules/community-groups/community-groups.module';
import { CommunityModerationModule } from './modules/community-moderation/community-moderation.module';
import { CommunityResearchModule } from './modules/community-research/community-research.module';
import { DocumentIntelligenceModule } from './modules/document-intelligence/document-intelligence.module';
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

/**
 * Root application module — registers all MVP domain modules.
 * Iterative development: implement one module at a time (auth → persons → …).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AiModule,
    AuthModule,
    UsersModule,
    PersonsModule,
    FamiliesModule,
    RelationshipsModule,
    EventsModule,
    PlacesModule,
    MediaModule,
    FaceTagsModule,
    PersonPhotoLinksModule,
    PhotoAnalysisModule,
    DocumentsModule,
    DocumentIntelligenceModule,
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
  ],
})
export class AppModule {}
