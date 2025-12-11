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
    const article = await this.articleRepo.findOne({
      where: { id: articleId },
      relations: ['seller', 'shop', 'shop.owner'],
    });

    if (!article) return;

    const history = await this.historyRepo.find({
      where: { article: { id: articleId } },
      order: { changed_at: 'ASC' },
    });

    const basePrices =
      history.length > 0
        ? history.map((h) => Number(h.new_price))
        : [Number(article.price)];

    const sorted = [...basePrices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    const median =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;

    if (median === 0) return;
    const upperLimit = median * 1.1;
    const lowerLimit = median * 0.5;

    if (newPrice >= lowerLimit && newPrice <= upperLimit) return;

    const diffPercent = Math.abs((newPrice - median) / median) * 100;

    let severity: FraudSeverity;
    let reason: string;

    if (newPrice > upperLimit) {
      severity = diffPercent > 30 ? FraudSeverity.HIGH : FraudSeverity.MEDIUM;
      reason = `Augmentation anormale de +${Math.round(
        diffPercent,
      )}% par rapport au prix médian (${median}€)`;
    } else {
      severity = diffPercent > 50 ? FraudSeverity.HIGH : FraudSeverity.MEDIUM;
      reason = `Baisse anormale de -${Math.round(
        diffPercent,
      )}% par rapport au prix médian (${median}€)`;
    }

    const articleAlert = await this.alertRepo.save({
      article: { id: articleId },
      severity,
      reason,
      average_price: median,
      last_price_recorded: newPrice,
      diff_percent: Math.round(diffPercent),
    });

    this.fraudGateway.emitNewAlert({
      id: articleAlert.id,
      article: { id: articleId, title: article.title },
      severity,
      reason,
      average_price: median,
      last_price_recorded: newPrice,
      diff_percent: Math.round(diffPercent),
      created_at: articleAlert.created_at,
    });

    const responsibleUser = article.seller ?? article.shop?.owner ?? null;

    let userAlert: FraudAlert | null = null;

    if (responsibleUser) {
      const userId = responsibleUser.id;

      const userAlerts = await this.alertRepo
        .createQueryBuilder('alert')
        .leftJoin('alert.article', 'a')
        .leftJoin('a.seller', 'seller')
        .leftJoin('a.shop', 'shop')
        .leftJoin('shop.owner', 'owner')
        .where('seller.id = :userId OR owner.id = :userId', { userId })
        .getMany();

      const fraudulentCount = userAlerts.filter(
        (a) => !a.reason.toLowerCase().includes('utilisateur'),
      ).length;

      if (fraudulentCount >= 2) {
        const userReason = `L'utilisateur ${
          responsibleUser.userName ?? responsibleUser.email
        } a effectué au moins 2 modifications de prix jugées frauduleuses. Potentiellement arnaqueur.`;

        userAlert = await this.alertRepo.save({
          article: { id: articleId },
          severity: FraudSeverity.HIGH,
          reason: userReason,
          average_price: median,
          last_price_recorded: newPrice,
          diff_percent: Math.round(diffPercent),
        });

        this.fraudGateway.emitNewAlert({
          id: userAlert.id,
          article: { id: articleId, title: article.title },
          user_id: responsibleUser.id,
          severity: userAlert.severity,
          reason: userReason,
          average_price: userAlert.average_price,
          last_price_recorded: userAlert.last_price_recorded,
          diff_percent: userAlert.diff_percent,
          created_at: userAlert.created_at,
        });
      }
    }

    return {
      articleAlert,
      userAlert,
    };
  }

  async getAlerts() {
    const alerts = await this.alertRepo.find({
      relations: [
        'article',
        'article.seller',
        'article.shop',
        'article.shop.owner',
      ],
      order: { created_at: 'DESC' },
    });

    return alerts.map((alert) => {
      const responsibleUser =
        alert.article?.seller ?? alert.article?.shop?.owner ?? null;

      return {
        ...alert,
        user_id: alert.reason.toLowerCase().includes('utilisateur')
          ? (responsibleUser?.id ?? null)
          : null,
      };
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
