import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Article } from 'src/articles/article.entity';
import { FraudAlert, FraudSeverity } from 'src/fraud/fraud-alert.entity';
import { User } from 'src/users/user.entity';

import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { ConversationMessage } from 'src/chat/conversation-message.entity';
import { UserRole } from 'src/users/user.entity';

@Controller('admin')
@UseGuards(KeycloakAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Article) private articleRepo: Repository<Article>,
    @InjectRepository(FraudAlert) private alertsRepo: Repository<FraudAlert>,
    @InjectRepository(ConversationMessage)
    private chatRepo: Repository<ConversationMessage>,
  ) {}

  @Get('stats')
  async getStats() {
    const users = await this.usersRepo.count();
    const articles = await this.articleRepo.count();
    const alerts = await this.alertsRepo.count();
    const messages = await this.chatRepo.count();

    const highAlerts = await this.alertsRepo.count({
      where: { severity: FraudSeverity.HIGH },
    });

    const mediumAlerts = await this.alertsRepo.count({
      where: { severity: FraudSeverity.MEDIUM },
    });

    return {
      counters: { users, articles, alerts, messages },
      fraud: {
        high: highAlerts,
        medium: mediumAlerts,
        riskIndex: highAlerts * 2 + mediumAlerts,
      },
    };
  }
}
