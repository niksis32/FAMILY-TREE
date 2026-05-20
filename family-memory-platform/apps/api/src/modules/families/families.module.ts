import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { FamiliesController } from './families.controller';
import { FamiliesService } from './families.service';

/** Family groups (marriage/unions) and FamilyMember links */
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FamiliesController],
  providers: [FamiliesService],
})
export class FamiliesModule {}
