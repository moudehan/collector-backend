import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Article } from 'src/articles/article.entity';
import { FraudAlert, FraudSeverity } from 'src/fraud/fraud-alert.entity';
import { User, UserRole } from 'src/users/user.entity';
import { ConversationMessage } from 'src/chat/conversation-message.entity';
import { Shop } from 'src/shops/shop.entity';

import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

interface AlertsByDayDto {
  date: string;
  count: number;
}

interface CountersDto {
  users: number;
  articles: number;
  alerts: number;
  shops: number;
  messages: number;
}

interface FraudStatsDto {
  high: number;
  medium: number;
  riskIndex: number;
}

interface AdminStatsDto {
  counters: CountersDto;
  fraud: FraudStatsDto;
  alertsByDay: AlertsByDayDto[];
}

@Controller('admin')
@UseGuards(KeycloakAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    @InjectRepository(FraudAlert)
    private readonly alertsRepo: Repository<FraudAlert>,
    @InjectRepository(ConversationMessage)
    private readonly chatRepo: Repository<ConversationMessage>,
    @InjectRepository(Shop)
    private readonly shopsRepo: Repository<Shop>,
  ) {}

  @Get('stats')
  async getStats(): Promise<AdminStatsDto> {
    const [users, articles, alerts, messages] = await Promise.all([
      this.usersRepo.count(),
      this.articleRepo.count(),
      this.alertsRepo.count(),
      this.chatRepo.count(),
    ]);

    let shops = 0;
    try {
      shops = await this.shopsRepo.count();
    } catch (error) {
      this.logger.error('Erreur lors du comptage des shops', error as Error);
    }

    const [highAlerts, mediumAlerts] = await Promise.all([
      this.alertsRepo.count({
        where: { severity: FraudSeverity.HIGH },
      }),
      this.alertsRepo.count({
        where: { severity: FraudSeverity.MEDIUM },
      }),
    ]);

    let alertsByDay: AlertsByDayDto[] = [];

    try {
      const alertsWithDate = await this.alertsRepo.find({
        select: ['created_at'],
      });

      const countsByDay = new Map<string, number>();

      for (const alert of alertsWithDate) {
        const rawDate: unknown = alert?.created_at;
        if (!rawDate) {
          continue;
        }

        const dateObj =
          rawDate instanceof Date ? rawDate : new Date(rawDate as string);

        if (Number.isNaN(dateObj.getTime())) {
          continue;
        }

        const dayKey = dateObj.toISOString().slice(0, 10);
        countsByDay.set(dayKey, (countsByDay.get(dayKey) ?? 0) + 1);
      }

      alertsByDay = Array.from(countsByDay.entries())
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([date, count]) => ({
          date,
          count,
        }));
    } catch (error) {
      this.logger.error(
        'Erreur lors du calcul des alertes par jour',
        error as Error,
      );
      alertsByDay = [];
    }

    return {
      counters: { users, articles, alerts, shops, messages },
      fraud: {
        high: highAlerts,
        medium: mediumAlerts,
        riskIndex: highAlerts * 2 + mediumAlerts,
      },
      alertsByDay,
    };
  }
}
