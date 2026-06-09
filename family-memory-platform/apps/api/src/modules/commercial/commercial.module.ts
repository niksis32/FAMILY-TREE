import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { BillingService } from './billing.service';
import { CommercialAuditService } from './commercial-audit.service';
import { CommercialContextService } from './commercial-context.service';
import { CommercialPlansService } from './commercial-plans.service';
import { CommercialController } from './commercial.controller';
import { CommercialService } from './commercial.service';
import { ExportService } from './export.service';
import { InvitesService } from './invites.service';
import { PrivacyService } from './privacy.service';
import { UsageMeterService } from './usage-meter.service';

@Module({
  imports: [PrismaModule, AuthModule, WorkspacesModule, forwardRef(() => PrivacyModule)],
  controllers: [CommercialController],
  providers: [
    CommercialPlansService,
    BillingService,
    CommercialContextService,
    UsageMeterService,
    CommercialService,
    InvitesService,
    CommercialAuditService,
    PrivacyService,
    ExportService,
  ],
  exports: [
    CommercialContextService,
    CommercialService,
    UsageMeterService,
    BillingService,
    PrivacyService,
    ExportService,
  ],
})
export class CommercialModule {}
