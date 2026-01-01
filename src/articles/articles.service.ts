import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { File as MulterFile } from 'multer';
import { ArticleRating } from 'src/articles/article-rating.entity';
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
    @InjectRepository(ArticleRating)
    private readonly articleRatingRepo: Repository<ArticleRating>,
  ) {}

  private computeModerationReasons(input: {
    title?: string | null;
    description?: string | null;
    price: number;
    shipping_cost: number;
    quantity: number;
    imagesCount: number;
    productionYear?: number | null;
  }) {
    const reasons: string[] = [];

    const price = Number(input.price);
    const shipping = Number(input.shipping_cost);
    const quantity = Number(input.quantity);
    const imagesCount = Number(input.imagesCount);

    const MAX_SHIPPING_COST = 100;
    const MAX_PRICE = 100000; // 100k
    const MIN_TITLE_LEN = 5;
    const MAX_TITLE_LEN = 120;
    const MIN_DESC_LEN = 20;
    const MAX_DESC_LEN = 2500;
    const MAX_IMAGES = 10;
    const MIN_YEAR = 1900;
    const MAX_YEAR = new Date().getFullYear() + 1;

    if (!Number.isFinite(price)) reasons.push('Prix invalide (non numérique).');
    else {
      if (price <= 0) reasons.push('Prix invalide (doit être > 0).');
      if (price > MAX_PRICE)
        reasons.push(`Prix trop élevé (doit être ≤ ${MAX_PRICE}).`);
    }

    if (!Number.isFinite(shipping))
      reasons.push('Frais de livraison invalides (non numérique).');
    else {
      if (shipping < 0)
        reasons.push('Frais de livraison invalides (doivent être ≥ 0).');
      if (shipping > MAX_SHIPPING_COST)
        reasons.push(
          `Frais de livraison trop élevés (doivent être ≤ ${MAX_SHIPPING_COST}).`,
        );
      if (Number.isFinite(price) && price > 0 && shipping > price) {
        reasons.push('Frais de livraison incohérents (supérieurs au prix).');
      }
    }

    if (!Number.isFinite(quantity))
      reasons.push('Quantité invalide (non numérique).');
    else {
      if (quantity <= 0) reasons.push('Quantité invalide (doit être > 0).');
      if (!Number.isInteger(quantity))
        reasons.push('Quantité invalide (doit être un entier).');
      if (quantity > 999) reasons.push('Quantité trop élevée (max 999).');
    }

    if (imagesCount <= 0) reasons.push('Aucune image ajoutée.');
    if (imagesCount > MAX_IMAGES)
      reasons.push(`Trop d’images (max ${MAX_IMAGES}).`);

    const title = (input.title ?? '').trim();
    if (title.length < MIN_TITLE_LEN)
      reasons.push(`Titre trop court (min ${MIN_TITLE_LEN} caractères).`);
    if (title.length > MAX_TITLE_LEN)
      reasons.push(`Titre trop long (max ${MAX_TITLE_LEN} caractères).`);

    const desc = (input.description ?? '').trim();
    if (desc.length < MIN_DESC_LEN)
      reasons.push(`Description trop courte (min ${MIN_DESC_LEN} caractères).`);
    if (desc.length > MAX_DESC_LEN)
      reasons.push(`Description trop longue (max ${MAX_DESC_LEN} caractères).`);

    if (input.productionYear !== undefined && input.productionYear !== null) {
      const y = Number(input.productionYear);
      if (!Number.isFinite(y)) reasons.push('Année de production invalide.');
      else if (!Number.isInteger(y))
        reasons.push('Année de production invalide (entier attendu).');
      else if (y < MIN_YEAR || y > MAX_YEAR)
        reasons.push(
          `Année de production invalide (doit être entre ${MIN_YEAR} et ${MAX_YEAR}).`,
        );
    }

    return reasons;
  }

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

    const quantity =
      typeof dto.quantity === 'number' && dto.quantity > 0 ? dto.quantity : 1;

    const article = this.repo.create({
      title: dto.title,
      description: dto.description,
      price: Number(dto.price),
      shipping_cost: Number(dto.shipping_cost),
      status: ArticleStatus.PENDING,
      seller: { id: userId } as User,
      shop: { id: dto.shopId } as Shop,
      category: { id: dto.categoryId } as Category,
      quantity,
      vintageEra: dto.vintageEra ?? null,
      productionYear: dto.productionYear ?? null,
      conditionLabel: dto.conditionLabel ?? null,
      vintageNotes: dto.vintageNotes ?? null,
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

    const price = Number(dto.price);
    const shippingCost = Number(dto.shipping_cost);
    const hasImages = Array.isArray(images) ? images.length : 0;

    const reasons = this.computeModerationReasons({
      title: dto.title,
      description: dto.description,
      price,
      shipping_cost: shippingCost,
      quantity,
      imagesCount: hasImages,
      productionYear: dto.productionYear ?? null,
    });

    if (reasons.length === 0) {
      try {
        await this.fraudService.checkPriceAnomaly(savedArticle.id, price);
        await this.approve(savedArticle.id);
      } catch (e) {
        console.error(e);
        await this.repo.update(savedArticle.id, {
          status: ArticleStatus.PENDING,
          moderation_reasons: [
            'Anomalie de prix détectée : validation manuelle requise.',
          ],
        });
      }
    } else {
      await this.repo.update(savedArticle.id, {
        status: ArticleStatus.PENDING,
        moderation_reasons: reasons,
      });
    }

    return this.repo.findOne({
      where: { id: savedArticle.id },
      relations: ['images', 'category', 'shop'],
    });
  }

  findMine(userId: string) {
    return this.repo.find({
      where: { seller: { id: userId } },
      relations: ['shop', 'images', 'category'],
    });
  }

  async findOneById(
    id: string,
    userId?: string,
  ): Promise<(Article & { userRating?: number | null }) | null> {
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
        (like) => like.user?.id === userId,
      );
    } else {
      article.isFavorite = false;
    }

    let userRating: number | null = null;

    if (userId) {
      const rating = await this.articleRatingRepo.findOne({
        where: {
          article: { id },
          user: { id: userId },
        },
      });

      userRating = rating ? rating.value : null;
    }

    return {
      ...article,
      userRating,
    };
  }

  async delete(id: string) {
    const result = await this.repo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Article non trouvé');
    }

    return { success: true };
  }

  async approve(id: string) {
    const article = await this.repo.findOne({
      where: { id },
      relations: ['category', 'seller', 'shop'],
    });

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

    const interestedUsers = await this.likeRepo
      .createQueryBuilder('like')
      .leftJoin('like.article', 'articleLiked')
      .leftJoin('like.user', 'user')
      .where('articleLiked.categoryId = :categoryId', {
        categoryId: article.category.id,
      })
      .select('user.id', 'userId')
      .addSelect('COUNT(like.id)', 'total')
      .groupBy('user.id')
      .having('COUNT(like.id) >= 2')
      .getRawMany<{ userId: string; total: number }>();

    const userIdsToNotify = interestedUsers
      .map((u) => u.userId)
      .filter((id) => id !== article.seller.id);

    for (const targetUserId of userIdsToNotify) {
      const savedNotif = await this.notificationsService.send(
        targetUserId,
        NotificationType.NEW_ARTICLE,
        {
          article_id: article.id,
          title: article.title,
          categoryId: article.category.id,
          message: 'Un article approuvé correspond à vos centres d’intérêt',
        },
        article.seller.id,
      );

      if (savedNotif && targetUserId !== article.seller.id) {
        this.articleGateway.emitNewArticleInterest({
          id: savedNotif.id,
          type: NotificationType.NEW_ARTICLE,
          title: article.title,
          message: savedNotif.payload?.message,
          article_id: article.id,
          created_at: savedNotif.created_at,
          userId: targetUserId,
        });
      }
    }

    return {
      success: true,
      message: 'Article approuvé avec succès.',
    };
  }

  async reject(id: string, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('Une raison de rejet est requise.');
    }

    const article = await this.repo.findOne({
      where: { id },
      relations: ['seller'],
    });
    if (!article) throw new NotFoundException('Article introuvable.');

    if (article.status === ArticleStatus.APPROVED) {
      throw new BadRequestException(
        'Impossible de rejeter un article déjà approuvé.',
      );
    }

    article.status = ArticleStatus.REJECTED;
    article.rejection_reason = reason.trim();
    article.rejected_at = new Date();

    await this.repo.save(article);

    const savedNotif = await this.notificationsService.send(
      article.seller.id,
      NotificationType.ARTICLE_REJECTED,
      {
        article_id: article.id,
        title: article.title,
        reason: article.rejection_reason,
        message: 'Votre article a été rejeté',
      },
    );

    if (savedNotif) {
      this.articleGateway.emitNewArticleInterest({
        id: savedNotif.id,
        type: NotificationType.ARTICLE_REJECTED,
        title: article.title,
        message: savedNotif.payload?.message,
        article_id: article.id,
        reason: savedNotif.payload?.reason,
        created_at: savedNotif.created_at,
        userId: article.seller.id,
      });
    }

    return {
      success: true,
      message: 'Article rejeté.',
      reason: article.rejection_reason,
    };
  }

  publicCatalogue(categoryId?: string) {
    const query = this.repo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.shop', 'shop')
      .leftJoinAndSelect('article.seller', 'seller')
      .leftJoinAndSelect('article.images', 'images')
      .leftJoinAndSelect('article.category', 'category')
      .where('article.status = :status', { status: ArticleStatus.APPROVED })
      .andWhere('article.quantity > 0');

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
      .leftJoinAndSelect('article.category', 'category')
      .where('article.status = :status', { status: ArticleStatus.APPROVED })
      .andWhere('article.quantity > 0');

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

    const previousStatus = article.status;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const keptImages: { id: string }[] = dto.oldImages
      ? JSON.parse(dto.oldImages)
      : [];

    const keptIds = keptImages.map((img) => img.id);

    const imagesToDelete = article.images.filter(
      (img) => !keptIds.includes(img.id),
    );

    if (imagesToDelete.length > 0) {
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

    let priceCheckDone = false;
    let priceCheckFailed = false;

    if (
      dto.price !== undefined &&
      Number(dto.price) !== Number(article.price)
    ) {
      priceCheckDone = true;

      try {
        await this.fraudService.checkPriceAnomaly(
          article.id,
          Number(dto.price),
        );
      } catch (e) {
        console.error(e);
        priceCheckFailed = true;
      }

      await this.priceRepo.save({
        article: { id: article.id },
        old_price: article.price,
        new_price: Number(dto.price),
      });

      article.price = Number(dto.price);
    }

    if (dto.title !== undefined) article.title = dto.title;
    if (dto.description !== undefined) article.description = dto.description;
    if (dto.shipping_cost !== undefined) {
      article.shipping_cost = Number(dto.shipping_cost);
    }

    if (dto.categoryId) {
      article.category = { id: dto.categoryId } as Category;
    }

    if (dto.quantity !== undefined && dto.quantity > 0) {
      article.quantity = dto.quantity;
    }

    if (dto.vintageEra !== undefined) {
      article.vintageEra = dto.vintageEra || null;
    }

    if (dto.productionYear !== undefined) {
      article.productionYear = dto.productionYear ?? null;
    }

    if (dto.conditionLabel !== undefined) {
      article.conditionLabel = dto.conditionLabel || null;
    }

    if (dto.vintageNotes !== undefined) {
      article.vintageNotes = dto.vintageNotes || null;
    }

    await this.repo.save(article);

    const updated = await this.repo.findOne({
      where: { id: article.id },
      relations: ['images', 'category', 'shop', 'seller'],
    });
    if (!updated)
      throw new NotFoundException('Article introuvable après update');

    const isResubmission =
      previousStatus === ArticleStatus.REJECTED ||
      previousStatus === ArticleStatus.PENDING;

    if (isResubmission) {
      updated.status = ArticleStatus.PENDING;

      updated.rejection_reason = null;
      updated.rejected_at = null;

      const reasons = this.computeModerationReasons({
        title: updated.title,
        description: updated.description,
        price: Number(updated.price),
        shipping_cost: Number(updated.shipping_cost),
        quantity: Number(updated.quantity),
        imagesCount: Array.isArray(updated.images) ? updated.images.length : 0,
        productionYear: updated.productionYear ?? null,
      });

      if (priceCheckFailed) {
        reasons.push(
          'Anomalie de prix détectée : validation manuelle requise.',
        );
      }

      if (reasons.length > 0) {
        updated.moderation_reasons = reasons;
        updated.status = ArticleStatus.PENDING;
      } else {
        if (!priceCheckDone) {
          try {
            await this.fraudService.checkPriceAnomaly(
              updated.id,
              Number(updated.price),
            );
          } catch (e) {
            console.error(e);
            priceCheckFailed = true;
          }
        }

        if (priceCheckFailed) {
          updated.status = ArticleStatus.PENDING;
          updated.moderation_reasons = [
            'Anomalie de prix détectée : validation manuelle requise.',
          ];
        } else {
          updated.status = ArticleStatus.APPROVED;
          updated.moderation_reasons = null;
        }
      }

      await this.repo.save(updated);
    }

    const followers = await this.likeRepo.find({
      where: { article: { id: updated.id } },
      relations: ['user'],
    });

    for (const f of followers) {
      if (f.user.id === userId) continue;

      const savedNotif = await this.notificationsService.send(
        f.user.id,
        NotificationType.ARTICLE_UPDATED,
        {
          article_id: updated.id,
          title: updated.title,
          message: 'Un article que vous suivez a été modifié',
        },
        userId,
      );

      if (savedNotif && f.user.id !== userId) {
        this.articleGateway.emitNewArticleInterest({
          id: savedNotif.id,
          type: NotificationType.ARTICLE_UPDATED,
          title: updated.title,
          message: savedNotif.payload?.message,
          article_id: updated.id,
          created_at: savedNotif.created_at,
          userId: f.user.id,
        });
      }
    }

    return this.repo.findOne({
      where: { id: updated.id },
      relations: ['images', 'category', 'shop'],
    });
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

    if (preferredCategories.length === 0) {
      return [];
    }

    const likedIds = new Set(liked.map((l) => l.article.id));

    const recommendations = await this.repo
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoinAndSelect('article.shop', 'shop')
      .leftJoinAndSelect('article.seller', 'seller')
      .leftJoinAndSelect('article.images', 'images')
      .where('category.id IN (:...cats)', { cats: preferredCategories })
      .andWhere('article.status = :status', {
        status: ArticleStatus.APPROVED,
      })
      .andWhere('article.quantity > 0')
      .getMany();

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
