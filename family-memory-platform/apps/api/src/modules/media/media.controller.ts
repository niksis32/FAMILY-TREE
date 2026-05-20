import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateMediaMetadataDto, CreateUploadUrlDto, LinkMediaDto } from './media.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post('upload-url')
  createUploadUrl(@Body() dto: CreateUploadUrlDto) {
    return this.service.createUploadUrl(dto);
  }

  @Post('metadata')
  createMetadata(@Body() dto: CreateMediaMetadataDto) {
    return this.service.createMetadata(dto);
  }

  @Get(':id/download-url')
  createDownloadUrl(@Param('id') id: string) {
    return this.service.createDownloadUrl(id);
  }

  @Post(':id/link')
  link(@Param('id') id: string, @Body() dto: LinkMediaDto) {
    return this.service.linkMedia(id, dto);
  }
}
