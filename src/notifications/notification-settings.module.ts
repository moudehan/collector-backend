import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationSettingsController } from './notification-settings.controller';
import { NotificationSettings } from './notification-settings.entity';
import { NotificationSettingsService } from './notification-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationSettings])],
  providers: [NotificationSettingsService],
  controllers: [NotificationSettingsController],
  exports: [NotificationSettingsService],
})
export class NotificationSettingsModule {}
