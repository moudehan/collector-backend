import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [NotificationsService, NotificationsGateway],
  controllers: [NotificationsController],
  exports: [NotificationsService, TypeOrmModule],
})
export class NotificationsModule {}
