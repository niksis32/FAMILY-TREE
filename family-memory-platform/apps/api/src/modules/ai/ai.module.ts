import { Module } from '@nestjs/common';
import { PrivacyModule } from '../privacy/privacy.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [PrivacyModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
