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
    if (!dto.categoryId) {
      throw new BadRequestException({ message: 'categoryId est requis' });
    }

    if (!dto.shopId) {
      throw new BadRequestException({ message: 'shopId est requis' });
    }

    const existing = await this.repo.findOne({
      where: {
        title: dto.title,
        seller: { id: userId },
        shop: { id: dto.shopId },
      },
    });

    if (existing) {
      throw new BadRequestException({
        success: false,
        message:
          'Vous avez déjà créé un article avec ce titre dans cette boutique.',
      });
    }

    const article = this.repo.create({
      title: dto.title,
      description: dto.description,
      price: Number(dto.price),
      shipping_cost: Number(dto.shipping_cost),
      status: ArticleStatus.PENDING,
      seller: { id: userId } as User,
      shop: { id: dto.shopId } as Shop,
      category: { id: dto.categoryId } as Category,
    });

    return this.repo.save(article);
  }
  findMine(userId: string) {
    return this.repo.find({
      where: { seller: { id: userId } },
      relations: ['shop'],
    });
  }

  async findOneById(id: string): Promise<Article | null> {
    return this.repo
      .createQueryBuilder('article')

      .leftJoinAndSelect('article.shop', 'shop')
      .leftJoin('shop.owner', 'owner')
      .leftJoin('article.seller', 'seller')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.likes', 'likes')
      .leftJoin('likes.user', 'likeUser')
      .leftJoinAndSelect('article.fraud_alerts', 'fraud_alerts')
      .leftJoinAndSelect('article.price_history', 'price_history')
      .addSelect(['seller.id', 'seller.email', 'seller.created_at'])
      .addSelect(['owner.id', 'owner.email', 'owner.created_at'])
      .addSelect(['likeUser.id', 'likeUser.email', 'likeUser.created_at'])
      .where('article.id = :id', { id })
      .orderBy('fraud_alerts.created_at', 'DESC')
      .getOne();
  }

  async delete(id: string) {
    const result = await this.repo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Article non trouvé');
    }

    return { success: true };
  }

  async approve(id: string) {
    const article = await this.repo.findOne({ where: { id } });

    if (!article) {
      throw new NotFoundException('Article introuvable.');
    }

    if (article.status === ArticleStatus.APPROVED) {
      throw new BadRequestException('Cet article est déjà approuvé.');
    }

    if (article.status === ArticleStatus.REJECTED) {
      throw new BadRequestException(
        'Impossible d’approuver un article déjà rejeté.',
      );
    }

    article.status = ArticleStatus.APPROVED;
    await this.repo.save(article);

    return {
      success: true,
      message: 'Article approuvé avec succès.',
    };
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
    const article = await this.repo.findOne({ where: { id: articleId } });

    if (!article) {
      throw new NotFoundException('Article introuvable.');
    }

    if (article.status !== ArticleStatus.APPROVED) {
      throw new BadRequestException(
        'Vous ne pouvez suivre que des articles approuvés.',
      );
    }

    const already = await this.likeRepo.findOne({
      where: { article: { id: articleId }, user: { id: userId } },
    });

    if (already) {
      return {
        success: false,
        message: 'Vous suivez déjà cet article.',
      };
    }

    await this.likeRepo.insert({
      article: { id: articleId },
      user: { id: userId },
    });

    await this.repo.increment({ id: articleId }, 'likesCount', 1);

    return {
      success: true,
      message: 'Article suivi avec succès.',
    };
  }

  async unfollow(articleId: string, userId: string) {
    const existing = await this.likeRepo.findOne({
      where: { article: { id: articleId }, user: { id: userId } },
    });

    if (!existing) {
      return {
        success: false,
        message: 'Vous ne suivez pas cet article.',
      };
    }

    await this.likeRepo.delete({
      article: { id: articleId },
      user: { id: userId },
    });

    await this.repo.decrement({ id: articleId }, 'likesCount', 1);

    return {
      success: true,
      message: 'Vous ne suivez plus cet article.',
    };
  }

  async getFollowing(userId: string) {
    const likes = await this.likeRepo.find({
      where: { user: { id: userId } },
      relations: [
        'article',
        'article.category',
        'article.seller',
        'article.shop',
      ],
    });

    const seen = new Set<string>();
    const articles: Article[] = [];

    for (const like of likes) {
      if (!seen.has(like.article.id)) {
        seen.add(like.article.id);
        articles.push(like.article);
      }
    }

    return articles;
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

  async getRecommendations(userId: string, userRole: string) {
    const liked = await this.likeRepo.find({
      where: { user: { id: userId } },
      relations: ['article', 'article.category'],
    });

    if (liked.length === 0) return [];

    const categoryScore: Record<string, number> = {};

    for (const like of liked) {
      const catId = like.article.category.id;
      categoryScore[catId] = (categoryScore[catId] || 0) + 1;
    }

    const preferredCategories = Object.keys(categoryScore).filter(
      (catId) => categoryScore[catId] >= 2,
    );

    console.log('Category score =', categoryScore);
    console.log('Preferred categories =', preferredCategories);

    if (preferredCategories.length === 0) {
      console.log('Aucune catégorie assez likée → pas de recommandations');
      return [];
    }

    const likedIds = new Set(liked.map((l) => l.article.id));

    const recommendations = await this.repo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.shop', 'shop')
      .leftJoinAndSelect('article.seller', 'seller')
      .where('category.id IN (:...cats)', { cats: preferredCategories })
      .andWhere('article.status = :status', { status: ArticleStatus.APPROVED }) // 🔥 seulement approuvés
      .getMany();

    console.log('RAW RECOMMENDATIONS =', recommendations);

    const finalList = recommendations.filter((a) => {
      const isLiked = likedIds.has(a.id);
      const isOwn = a.seller?.id === userId;

      if (userRole === 'admin') {
        return !isLiked;
      }

      return !isLiked && !isOwn;
    });

    finalList.sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0));

    return finalList;
  }
}
