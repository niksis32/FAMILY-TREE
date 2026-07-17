import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminSiteService } from './admin-site.service';

@ApiTags('public')
@Controller('public/portal')
export class PortalPublicController {
  constructor(private readonly site: AdminSiteService) {}

  @Get('config')
  config() {
    return this.site.getPublicConfig();
  }
}
