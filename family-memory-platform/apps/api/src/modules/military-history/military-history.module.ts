import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommercialModule } from '../commercial/commercial.module';
import { MessengerModule } from '../messenger/messenger.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MilitaryHistoryController } from './military-history.controller';
import { MilitaryHistoryService } from './military-history.service';

@Module({
  imports: [AuthModule, CommercialModule, NotificationsModule, MessengerModule],
  controllers: [MilitaryHistoryController],
  providers: [MilitaryHistoryService],
  exports: [MilitaryHistoryService],
})
export class MilitaryHistoryModule {}
