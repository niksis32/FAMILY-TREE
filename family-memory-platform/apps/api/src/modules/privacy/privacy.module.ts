import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CommercialModule } from '../commercial/commercial.module';
import { AccessControlService } from './access-control.service';
import { AiAuditService } from './ai-audit.service';
import { AiConsentService } from './ai-consent.service';
import { GdprAccountService } from './gdpr-account.service';
import { PolicyEngineService } from './policy-engine.service';
import { PrivacyAuditService } from './privacy-audit.service';
import { AssetPrivacyService } from './asset-privacy.service';
import { CrossTenantPrivacyAuditService } from './cross-tenant-privacy-audit.service';
import { PrivacyCenterService } from './privacy-center.service';
import { PrivacyController } from './privacy.controller';
import { PublicLinkService } from './public-link.service';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => CommercialModule)],
  controllers: [PrivacyController],
  providers: [
    AssetPrivacyService,
    AccessControlService,
    PolicyEngineService,
    PrivacyAuditService,
    CrossTenantPrivacyAuditService,
    AiAuditService,
    AiConsentService,
    PublicLinkService,
    GdprAccountService,
    PrivacyCenterService,
  ],
  exports: [
    AssetPrivacyService,
    AccessControlService,
    PolicyEngineService,
    AiAuditService,
    AiConsentService,
    PrivacyAuditService,
    CrossTenantPrivacyAuditService,
  ],
})
export class PrivacyModule {}
