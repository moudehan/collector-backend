import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { NotificationSettingsService } from './notification-settings.service';

type JwtUserPayload = {
  id: string;
  email: string;
  role: string;
};

interface AuthenticatedRequest extends Request {
  user: JwtUserPayload;
}

@Controller('notifications/notification-settings')
@UseGuards(JwtAuthGuard)
export class NotificationSettingsController {
  constructor(
    private readonly notificationSettingsService: NotificationSettingsService,
  ) {}

  @Get()
  getMySettings(@Req() req: AuthenticatedRequest) {
    return this.notificationSettingsService.getOrCreate(req.user.id);
  }

  @Patch()
  updateMySettings(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateNotificationSettingsDto,
  ) {
    return this.notificationSettingsService.update(req.user.id, body);
  }
}
