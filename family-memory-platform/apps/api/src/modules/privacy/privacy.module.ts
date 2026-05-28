import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommercialModule } from '../commercial/commercial.module';
import { AccessControlService } from './access-control.service';
import { AiAuditService } from './ai-audit.service';
import { GdprAccountService } from './gdpr-account.service';
import { PolicyEngineService } from './policy-engine.service';
import { PrivacyAuditService } from './privacy-audit.service';
import { PrivacyCenterService } from './privacy-center.service';
import { PrivacyController } from './privacy.controller';
import { PublicLinkService } from './public-link.service';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => CommercialModule)],
  controllers: [PrivacyController],
  providers: [
    AccessControlService,
    PolicyEngineService,
    PrivacyAuditService,
    AiAuditService,
    PublicLinkService,
    GdprAccountService,
    PrivacyCenterService,
  ],
  exports: [AccessControlService, PolicyEngineService, AiAuditService, PrivacyAuditService],
})
export class PrivacyModule {}
