import { Module } from '@nestjs/common';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

/** Geographic places for events and migration maps */
@Module({
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
