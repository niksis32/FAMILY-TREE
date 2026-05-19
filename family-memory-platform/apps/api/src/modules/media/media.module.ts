import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

/** Photo/video/audio upload — MinIO presigned URLs, metadata in PostgreSQL */
@Module({
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
