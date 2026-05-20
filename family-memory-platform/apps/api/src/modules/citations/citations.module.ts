import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CitationsController } from './citations.controller';
import { CitationsService } from './citations.service';

/** Citations linking persons/facts to sources */
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CitationsController],
  providers: [CitationsService],
})
export class CitationsModule {}
