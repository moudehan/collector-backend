import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from 'src/mail/mail.module';
import { NotificationSettings } from 'src/notifications/notification-settings.entity';
import { NotificationSettingsModule } from 'src/notifications/notification-settings.module';
import { User } from 'src/users/user.entity';
import { NotificationMailService } from './notification-mail.service';
import { Notification } from './notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Notification, NotificationSettings]),
    NotificationSettingsModule,
    MailModule,
  ],
  providers: [
    NotificationsService,
    NotificationsGateway,
    NotificationMailService,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
