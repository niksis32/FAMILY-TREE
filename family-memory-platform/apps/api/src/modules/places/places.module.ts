import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

/** Geographic places for events and migration maps */
@Module({
  imports: [AuthModule, PrismaModule, SearchModule],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
