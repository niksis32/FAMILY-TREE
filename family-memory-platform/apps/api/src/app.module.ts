import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CitationsModule } from './modules/citations/citations.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EventsModule } from './modules/events/events.module';
import { FamiliesModule } from './modules/families/families.module';
import { GedcomModule } from './modules/gedcom/gedcom.module';
import { MediaModule } from './modules/media/media.module';
import { PersonsModule } from './modules/persons/persons.module';
import { PlacesModule } from './modules/places/places.module';
import { RelationshipsModule } from './modules/relationships/relationships.module';
import { SearchModule } from './modules/search/search.module';
import { SourcesModule } from './modules/sources/sources.module';
import { TimelineModule } from './modules/timeline/timeline.module';
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
    HealthModule,
    AuthModule,
    UsersModule,
    PersonsModule,
    FamiliesModule,
    RelationshipsModule,
    EventsModule,
    PlacesModule,
    MediaModule,
    DocumentsModule,
    SourcesModule,
    CitationsModule,
    TimelineModule,
    SearchModule,
    GedcomModule,
    AdminModule,
  ],
})
export class AppModule {}
