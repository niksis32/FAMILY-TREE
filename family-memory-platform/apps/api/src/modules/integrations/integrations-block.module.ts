import { Module } from '@nestjs/common';
import { BrandingModule } from '../branding/branding.module';
import { CemeteryModule } from '../cemetery/cemetery.module';
import { DnaModule } from '../dna/dna.module';
import { ExternalArchivesModule } from '../external-archives/external-archives.module';
import { PdfExportModule } from '../pdf-export/pdf-export.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

/** Umbrella module for BLOCK 5 — Integrations, Enterprise & Long-tail Value */
@Module({
  imports: [
    ExternalArchivesModule,
    WebhooksModule,
    BrandingModule,
    PdfExportModule,
    DnaModule,
    CemeteryModule,
  ],
  exports: [
    ExternalArchivesModule,
    WebhooksModule,
    BrandingModule,
    PdfExportModule,
    DnaModule,
    CemeteryModule,
  ],
})
export class IntegrationsBlockModule {}