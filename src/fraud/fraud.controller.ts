import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceHistory } from 'src/articles/price-history.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { FraudAlert, FraudSeverity } from './fraud-alert.entity';

@Controller('fraud')
export class FraudController {
  constructor(
    @InjectRepository(FraudAlert)
    private alertRepo: Repository<FraudAlert>,

    @InjectRepository(PriceHistory)
    private historyRepo: Repository<PriceHistory>,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('alerts')
  async getActiveAlerts() {
    const alerts = await this.alertRepo.find({
      relations: ['article'],
      order: { created_at: 'DESC' },
    });

    const result: {
      id: string;
      article: { id: string; title: string };
      severity: FraudSeverity;
      reason: string;
      average_price: number;
      last_price_recorded: number;
      diff_percent: number;
      created_at: Date;
    }[] = [];

    for (const alert of alerts) {
      const history = await this.historyRepo.find({
        where: { article: { id: alert.article.id } },
        order: { changed_at: 'ASC' },
      });

      if (!history.length) continue;

      const prices = history.map((h) => Number(h.new_price));
      const sorted = [...prices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);

      const median =
        sorted.length % 2 !== 0
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2;

      const lastPrice = Number(history.at(-1)!.new_price);
      const diff = Math.abs(lastPrice - median) / median;

      if (diff <= 0.1) continue;

      result.push({
        id: alert.id,
        article: { id: alert.article.id, title: alert.article.title },
        severity: alert.severity,
        reason: alert.reason,
        average_price: median,
        last_price_recorded: lastPrice,
        diff_percent: Math.round(diff * 100),
        created_at: alert.created_at,
      });
    }

    return result;
  }
}
