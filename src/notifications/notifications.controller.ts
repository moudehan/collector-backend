import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(KeycloakAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('my')
  getMyNotifications(@CurrentUser() user: JwtUser) {
    return this.service.getForUser(user.sub);
  }

  @Patch('read/:id')
  markAsRead(@Param('id') id: string) {
    return this.service.markAsRead(id);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: JwtUser) {
    return this.service.markAllAsRead(user.sub);
  }

  @Patch('unread-all')
  markAllAsUnread(@CurrentUser() user: JwtUser) {
    return this.service.markAllAsUnread(user.sub);
  }
}
