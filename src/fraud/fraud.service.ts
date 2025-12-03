import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Article } from 'src/articles/article.entity';
import { PriceHistory } from 'src/articles/price-history.entity';
import { Repository } from 'typeorm';
import { FraudAlert, FraudSeverity } from './fraud-alert.entity';
import { FraudGateway } from './fraud.gateway';

@Injectable()
export class FraudService {
  constructor(
    @InjectRepository(Article)
    private articleRepo: Repository<Article>,

    @InjectRepository(PriceHistory)
    private historyRepo: Repository<PriceHistory>,

    @InjectRepository(FraudAlert)
    private alertRepo: Repository<FraudAlert>,

    private readonly fraudGateway: FraudGateway,
  ) {}

  async checkPriceAnomaly(articleId: string, newPrice: number) {
    const history = await this.historyRepo.find({
      where: { article: { id: articleId } },
      order: { changed_at: 'ASC' },
    });

    if (history.length < 3) return;

    const prices = history.map((h) => Number(h.new_price));
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    const median =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;

    const diff = Math.abs(newPrice - median) / median;

    if (diff <= 0.1) return;

    let severity: FraudSeverity;
    let reason: string;

    if (diff > 0.3) {
      severity = FraudSeverity.HIGH;
      reason = `Prix potentiellement frauduleux (~${Math.round(
        diff * 100,
      )}% d'écart par rapport au marché)`;
    } else {
      severity = FraudSeverity.MEDIUM;
      reason = `Prix atypique (~${Math.round(
        diff * 100,
      )}% d'écart par rapport au marché)`;
    }

    const alert = await this.alertRepo.save({
      article: { id: articleId },
      severity,
      reason,
      average_price: median,
      last_price_recorded: newPrice,
      diff_percent: Math.round(diff * 100),
    });

    const article = await this.articleRepo.findOne({
      where: { id: articleId },
    });
    this.fraudGateway.emitNewAlert({
      id: alert.id,
      article: { id: articleId, title: article?.title ?? articleId },
      severity,
      reason,
      average_price: median,
      last_price_recorded: newPrice,
      diff_percent: Math.round(diff * 100),
      created_at: alert.created_at,
    });

    return alert;
  }

  async getAlerts() {
    return this.alertRepo.find({
      relations: ['article'],
      order: { created_at: 'DESC' },
    });
  }

  async markAsRead(id: string) {
    await this.alertRepo.update(id, { is_read: true });
    return { success: true };
  }

  async markAllRead() {
    const result = await this.alertRepo
      .createQueryBuilder()
      .update()
      .set({ is_read: true })
      .execute();

    return {
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues.',
      affected: result.affected ?? 0,
    };
  }

  async markAllUnread() {
    const result = await this.alertRepo
      .createQueryBuilder()
      .update()
      .set({ is_read: false })
      .execute();

    return {
      success: true,
      message: 'Toutes les notifications ont été marquées comme non lues.',
      affected: result.affected ?? 0,
    };
  }
  async deleteAlertsByArticleId(articleId: string): Promise<void> {
    await this.alertRepo.delete({ article: { id: articleId } });
  }
}
