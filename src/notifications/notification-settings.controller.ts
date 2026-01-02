import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { NotificationSettingsService } from './notification-settings.service';

type JwtUserPayload = {
  sub: string;
  id?: string;
  email?: string;
  role?: string;
};

interface AuthenticatedRequest extends Request {
  user: JwtUserPayload;
}

@Controller('notifications/notification-settings')
@UseGuards(KeycloakAuthGuard)
export class NotificationSettingsController {
  constructor(
    private readonly notificationSettingsService: NotificationSettingsService,
  ) {}

  @Get()
  getMySettings(@Req() req: AuthenticatedRequest) {
    return this.notificationSettingsService.getOrCreate(req.user.sub);
  }

  @Patch()
  updateMySettings(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateNotificationSettingsDto,
  ) {
    return this.notificationSettingsService.update(req.user.sub, body);
  }
}
