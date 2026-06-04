import { Controller, Get, Header, Param, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { FamilyStoriesService } from './family-stories.service';

@ApiTags('public-family-stories')
@Controller('public/family-stories')
export class FamilyStoriesPublicController {
  constructor(private readonly service: FamilyStoriesService) {}

  @Get('token/:token')
  getByToken(@Param('token') token: string, @Req() req: Request) {
    return this.service.getPublicByToken(token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('token/:token/pdf')
  @Header('Content-Type', 'application/pdf')
  async pdfByToken(@Param('token') token: string, @Res() res: Response) {
    const { buffer, filename } = await this.service.exportPdfByToken(token);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('sitemap')
  @Header('Cache-Control', 'public, max-age=300')
  sitemap() {
    return this.service.listSitemapEntries();
  }

  @Get('slug/:slug')
  getBySlug(
    @Param('slug') slug: string,
    @Query('token') token: string | undefined,
    @Req() req: Request,
  ) {
    return this.service.getPublicBySlug(slug, token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
