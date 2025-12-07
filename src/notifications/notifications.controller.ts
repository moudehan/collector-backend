import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
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
