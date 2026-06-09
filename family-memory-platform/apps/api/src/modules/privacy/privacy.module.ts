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
import { LivingPersonPolicyService } from './living-person-policy.service';
import { LivingPersonRecalcQueueService } from './living-person-recalc.queue';
import { LivingPersonRecalcProcessor } from './living-person-recalc.processor';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [PrismaModule, AuthModule, RedisModule, forwardRef(() => CommercialModule)],
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
    LivingPersonPolicyService,
    LivingPersonRecalcQueueService,
    LivingPersonRecalcProcessor,
  ],
  exports: [
    AssetPrivacyService,
    AccessControlService,
    PolicyEngineService,
    AiAuditService,
    AiConsentService,
    PrivacyAuditService,
    CrossTenantPrivacyAuditService,
    LivingPersonPolicyService,
    LivingPersonRecalcQueueService,
  ],
})
export class PrivacyModule {}
