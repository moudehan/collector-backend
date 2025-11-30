import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateArticleDto } from 'src/articles/dto/create-article.dto';
import { FraudService } from 'src/fraud/fraud.service';
import {
  Notification,
  NotificationType,
} from 'src/notifications/notification.entity';
import { Repository } from 'typeorm';
import { ArticleLike } from './article-like.entity';
import { Article, ArticleStatus } from './article.entity';
import { PriceHistory } from './price-history.entity';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article) private repo: Repository<Article>,
    @InjectRepository(PriceHistory) private priceRepo: Repository<PriceHistory>,
    @InjectRepository(ArticleLike) private likeRepo: Repository<ArticleLike>,
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    private fraudService: FraudService,
  ) {}

  create(dto: CreateArticleDto, userId: string) {
    const article = this.repo.create({
      title: dto.title,
      description: dto.description,
      price: dto.price,
      shipping_cost: dto.shipping_cost,
      shop: { id: dto.shopId },
      seller: { id: userId },
      status: ArticleStatus.PENDING,
    });

    return this.repo.save(article);
  }

  findMine(userId: string) {
    return this.repo.find({
      where: { seller: { id: userId } },
      relations: ['shop'],
    });
  }

  approve(id: string) {
    return this.repo.update(id, { status: ArticleStatus.APPROVED });
  }

  reject(id: string) {
    return this.repo.update(id, { status: ArticleStatus.REJECTED });
  }

  publicCatalogue() {
    return this.repo.find({
      where: { status: ArticleStatus.APPROVED },
      relations: ['shop', 'seller'],
    });
  }

  async follow(articleId: string, userId: string) {
    return this.likeRepo.save({
      article: { id: articleId },
      user: { id: userId },
    });
  }

  async unfollow(articleId: string, userId: string) {
    return this.likeRepo.delete({
      article: { id: articleId },
      user: { id: userId },
    });
  }

  async updatePrice(articleId: string, newPrice: number) {
    const article = await this.repo.findOne({ where: { id: articleId } });
    if (!article) throw new NotFoundException('Article introuvable');

    await this.fraudService.checkPriceAnomaly(articleId, newPrice);

    await this.priceRepo.save({
      article: { id: articleId },
      old_price: article.price,
      new_price: newPrice,
    });

    article.price = newPrice;
    await this.repo.save(article);

    const followers = await this.likeRepo.find({
      where: { article: { id: articleId } },
      relations: ['user'],
    });

    for (const f of followers) {
      await this.notifRepo.save({
        user: { id: f.user.id },
        type: NotificationType.PRICE_UPDATE,
        payload: { articleId, newPrice },
      });
    }

    return {
      success: true,
      message:
        'Prix mis à jour, notifications envoyées & vérification fraude effectuée',
    };
  }
}
