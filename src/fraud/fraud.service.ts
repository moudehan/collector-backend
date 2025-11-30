import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Article } from 'src/articles/article.entity';
import { PriceHistory } from 'src/articles/price-history.entity';
import { Repository } from 'typeorm';
import { FraudAlert, FraudSeverity } from './fraud-alert.entity';

@Injectable()
export class FraudService {
  constructor(
    @InjectRepository(Article) private articleRepo: Repository<Article>,
    @InjectRepository(PriceHistory)
    private historyRepo: Repository<PriceHistory>,
    @InjectRepository(FraudAlert) private alertRepo: Repository<FraudAlert>,
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

    let severity: FraudSeverity | null = null;
    let reason: string | null = null;

    if (diff <= 0.1) return;

    if (diff > 0.1 && diff <= 0.3) {
      severity = FraudSeverity.MEDIUM;
      reason = `Prix atypique (~${Math.round(diff * 100)}% d'écart par rapport au marché)`;
    }

    if (diff > 0.3) {
      severity = FraudSeverity.HIGH;
      reason = `Prix potentiellement frauduleux (~${Math.round(diff * 100)}% d'écart par rapport au marché)`;
    }

    if (!severity || !reason) return;

    await this.alertRepo.save({
      article: { id: articleId },
      severity,
      reason,
    });
  }
}
