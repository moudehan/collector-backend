import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/users/user.entity';
import { FraudService } from './fraud.service';

@Controller('fraud')
export class FraudController {
  constructor(private fraudService: FraudService) {}

  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('alerts')
  getAlerts() {
    return this.fraudService.getAlerts();
  }

  @Patch('read/:id')
  markAsRead(@Param('id') id: string) {
    return this.fraudService.markAsRead(id);
  }

  @Patch('read-all')
  markAllAsRead() {
    return this.fraudService.markAllRead();
  }

  @Patch('unread-all')
  markAllUnread() {
    return this.fraudService.markAllUnread();
  }
}
