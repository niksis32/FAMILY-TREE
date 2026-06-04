import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrivacyModule } from '../privacy/privacy.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [PrivacyModule, AuthModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
