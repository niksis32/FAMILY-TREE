import { Module } from '@nestjs/common';
import { CitationsController } from './citations.controller';
import { CitationsService } from './citations.service';

/** Citations linking persons/facts to sources */
@Module({
  controllers: [CitationsController],
  providers: [CitationsService],
})
export class CitationsModule {}
