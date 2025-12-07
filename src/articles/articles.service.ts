import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { File as MulterFile } from 'multer';
import { ArticleGateway } from 'src/articles/article.gateway';
import { CreateArticleDto } from 'src/articles/dto/create-article.dto';
import { UpdateArticleDto } from 'src/articles/dto/update-article.dto';
import { Category } from 'src/categories/category.entity';
import { FraudService } from 'src/fraud/fraud.service';
import {
  Notification,
  NotificationType,
} from 'src/notifications/notification.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { Shop } from 'src/shops/shop.entity';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { ArticleImage } from './article-image.entity';
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
    @InjectRepository(ArticleImage)
    private imgRepo: Repository<ArticleImage>,
    private readonly articleGateway: ArticleGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateArticleDto, images: MulterFile[], userId: string) {
    if (!dto.categoryId) {
      throw new BadRequestException({ message: 'categoryId est requis' });
    }

    if (!dto.shopId) {
      throw new BadRequestException({ message: 'shopId est requis' });
    }

    const shop = await this.repo.manager.getRepository(Shop).findOne({
      where: { id: dto.shopId },
      relations: ['owner'],
    });

    if (!shop) {
      throw new NotFoundException('Boutique introuvable');
    }

    if (shop.owner.id !== userId) {
      throw new BadRequestException({
        success: false,
        message:
          "Vous n'êtes pas autorisé à créer un article dans cette boutique.",
      });
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

    const savedArticle = await this.repo.save(article);

    if (images && images.length > 0) {
      const imageEntities = images.map((file) => ({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        url: `/uploads/articles/${file.filename}`,
        article: savedArticle,
      }));

      await this.imgRepo.save(imageEntities);
    }

    const interestedUsers = await this.likeRepo
      .createQueryBuilder('like')
      .leftJoin('like.article', 'article')
      .leftJoin('like.user', 'user')
      .where('article.categoryId = :categoryId', {
        categoryId: dto.categoryId,
      })
      .select('user.id', 'userId')
      .addSelect('COUNT(like.id)', 'total')
      .groupBy('user.id')
      .having('COUNT(like.id) >= 2')
      .getRawMany<{ userId: string; total: number }>();

    const userIdsToNotify = interestedUsers
      .map((u) => u.userId)
      .filter((id) => id !== userId);

    if (userIdsToNotify.length > 0) {
      this.articleGateway.emitNewArticleInterest({
        articleId: savedArticle.id,
        title: savedArticle.title,
        price: savedArticle.price,
        categoryId: dto.categoryId,
        created_at: savedArticle.created_at,
      });
    }

    for (const targetUserId of userIdsToNotify) {
      await this.notificationsService.send(
        targetUserId,
        NotificationType.NEW_ARTICLE,
        {
          article_id: savedArticle.id,
          title: savedArticle.title,
          categoryId: dto.categoryId,
          message: 'Un nouvel article correspond à vos centres d’intérêt',
        },
        userId,
      );
    }

    return this.repo.findOne({
      where: { id: savedArticle.id },
      relations: ['images'],
    });
  }

  findMine(userId: string) {
    return this.repo.find({
      where: { seller: { id: userId } },
      relations: ['shop'],
    });
  }

  async findOneById(id: string, userId?: string): Promise<Article | null> {
    const article = await this.repo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.shop', 'shop')
      .leftJoin('shop.owner', 'owner')
      .leftJoin('article.seller', 'seller')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.likes', 'likes')
      .leftJoin('likes.user', 'likeUser')
      .leftJoinAndSelect('article.fraud_alerts', 'fraud_alerts')
      .leftJoinAndSelect('article.price_history', 'price_history')
      .leftJoinAndSelect('article.images', 'images')
      .addSelect(['seller.id', 'seller.email', 'seller.created_at'])
      .addSelect(['owner.id', 'owner.email', 'owner.created_at'])
      .addSelect(['likeUser.id', 'likeUser.email', 'likeUser.created_at'])
      .where('article.id = :id', { id })
      .orderBy('fraud_alerts.created_at', 'DESC')
      .getOne();

    if (!article) return null;

    if (userId && article.likes) {
      article.isFavorite = article.likes.some(
        (like) => like.user && like.user.id === userId,
      );
    } else {
      article.isFavorite = false;
    }

    return article;
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

  publicCatalogue(categoryId?: string) {
    const query = this.repo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.shop', 'shop')
      .leftJoinAndSelect('article.seller', 'seller')
      .leftJoinAndSelect('article.images', 'images')
      .where('article.status = :status', { status: ArticleStatus.APPROVED });

    if (categoryId) {
      query.andWhere('article.categoryId = :categoryId', { categoryId });
    }

    return query.orderBy('article.created_at', 'DESC').getMany();
  }

  async privateCatalogue(categoryId?: string, userId?: string) {
    const query = this.repo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.shop', 'shop')
      .leftJoinAndSelect('article.seller', 'seller')
      .leftJoinAndSelect('article.images', 'images')
      .leftJoinAndSelect('article.likes', 'likes')
      .leftJoin('likes.user', 'likeUser')
      .where('article.status = :status', { status: ArticleStatus.APPROVED });

    if (userId) {
      query.andWhere('seller.id != :userId', { userId });

      query.addSelect(['likeUser.id']);
    }

    if (categoryId) {
      query.andWhere('article.categoryId = :categoryId', { categoryId });
    }

    const articles = await query
      .orderBy('article.created_at', 'DESC')
      .getMany();

    for (const a of articles) {
      a.isFavorite =
        !!userId &&
        Array.isArray(a.likes) &&
        a.likes.some((like) => like?.user?.id === userId);
    }

    return articles;
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
        'article.images',
      ],
    });

    const seen = new Set<string>();
    const articles: Article[] = [];

    for (const like of likes) {
      if (!seen.has(like.article.id)) {
        seen.add(like.article.id);
        like.article.isFavorite = true;
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

  async updateArticle(
    articleId: string,
    dto: UpdateArticleDto,
    newImages: MulterFile[],
    userId: string,
  ) {
    const article = await this.repo.findOne({
      where: { id: articleId },
      relations: ['images', 'seller'],
    });

    if (!article) throw new NotFoundException('Article introuvable');
    if (article.seller.id !== userId)
      throw new ForbiddenException('Non autorisé');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const keptImages: { id: string }[] = dto.oldImages
      ? JSON.parse(dto.oldImages)
      : [];

    const keptIds = keptImages.map((img) => img.id);

    const imagesToDelete = article.images.filter(
      (img) => !keptIds.includes(img.id),
    );

    if (imagesToDelete.length > 0) {
      console.log(
        '🗑 DELETE =',
        imagesToDelete.map((i) => i.id),
      );
      await this.imgRepo.delete(imagesToDelete.map((img) => img.id));
    }

    if (newImages && newImages.length > 0) {
      const imageEntities = newImages.map((file) =>
        this.imgRepo.create({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          url: `/uploads/articles/${file.filename}`,
          article: article,
        }),
      );

      await this.imgRepo.save(imageEntities);
    }

    if (
      dto.price !== undefined &&
      Number(dto.price) !== Number(article.price)
    ) {
      await this.fraudService.checkPriceAnomaly(article.id, Number(dto.price));

      await this.priceRepo.save({
        article: { id: article.id },
        old_price: article.price,
        new_price: Number(dto.price),
      });

      article.price = Number(dto.price);
    }

    if (dto.title !== undefined) article.title = dto.title;
    if (dto.description !== undefined) article.description = dto.description;
    if (dto.shipping_cost !== undefined)
      article.shipping_cost = Number(dto.shipping_cost);

    if (dto.categoryId) {
      article.category = { id: dto.categoryId } as Category;
    }

    await this.repo.save(article);

    const updated = await this.repo.findOne({
      where: { id: article.id },
      relations: ['images', 'category', 'shop'],
    });

    return updated;
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
      .andWhere('article.status = :status', { status: ArticleStatus.APPROVED })
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

    for (const a of finalList) {
      a.isFavorite = false;
    }
    return finalList;
  }
}
