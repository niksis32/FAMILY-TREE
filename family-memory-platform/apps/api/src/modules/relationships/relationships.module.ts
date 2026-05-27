import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RelationshipsController } from './relationships.controller';
import { RelationshipsService } from './relationships.service';

/** Kinship edges between persons — uses @family/genealogy-core rules */
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
  exports: [RelationshipsService],
})
export class RelationshipsModule {}
