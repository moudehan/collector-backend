import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateArticleDto } from 'src/articles/dto/create-article.dto';
import { Category } from 'src/categories/category.entity';
import { FraudService } from 'src/fraud/fraud.service';
import {
  Notification,
  NotificationType,
} from 'src/notifications/notification.entity';
import { Shop } from 'src/shops/shop.entity';
import { User } from 'src/users/user.entity';
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

  async create(dto: CreateArticleDto, userId: string) {
    if (!dto.categoryId) throw new BadRequestException('categoryId est requis');
    if (!dto.shopId) throw new BadRequestException('shopId est requis');

    const article = new Article();
    article.title = dto.title;
    article.description = dto.description;
    article.price = Number(dto.price);
    article.shipping_cost = Number(dto.shipping_cost);
    article.status = ArticleStatus.PENDING;

    article.seller = { id: userId } as User;
    article.shop = { id: dto.shopId } as Shop;
    article.category = { id: dto.categoryId } as Category;

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
