import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShopRating } from 'src/shops/shop-rating.entity';
import { Shop } from 'src/shops/shop.entity';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { CreateShopDto } from './dto/create-shop.dto';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
    @InjectRepository(ShopRating)
    private readonly shopRatingRepo: Repository<ShopRating>,
  ) {}

  async createShop(dto: CreateShopDto, userId: string) {
    const existing = await this.shopRepo.findOne({
      where: {
        name: dto.name,
        owner: { id: userId },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Vous avez déjà créé une boutique avec ce nom.',
      );
    }

    const shop = this.shopRepo.create({
      ...dto,
      owner: { id: userId } as User,
    });

    return this.shopRepo.save(shop);
  }

  async getShopsByUser(userId: string) {
    return this.shopRepo
      .createQueryBuilder('shop')
      .leftJoin('shop.owner', 'owner')
      .select([
        'shop.id',
        'shop.name',
        'shop.description',
        'shop.created_at',
        'owner.id',
        'owner.firstname',
        'owner.lastname',
      ])
      .where('owner.id = :userId', { userId })
      .getMany();
  }

  async getAllShopsWithArticles() {
    return this.shopRepo.find({
      relations: ['owner', 'articles', 'articles.category', 'articles.seller'],
      order: {
        articles: {
          created_at: 'DESC',
        },
      },
    });
  }

  async getShopById(shopId: string, userId?: string) {
    const shop = await this.shopRepo
      .createQueryBuilder('shop')
      .leftJoin('shop.owner', 'owner')
      .leftJoinAndSelect('shop.articles', 'article')
      .leftJoinAndSelect('article.category', 'category')
      .leftJoin('article.seller', 'seller')
      .leftJoinAndSelect('article.images', 'image')
      .leftJoinAndSelect('article.likes', 'likes')
      .leftJoin('likes.user', 'likeUser')

      .where('shop.id = :shopId', { shopId })
      .orderBy('article.created_at', 'DESC')

      .select([
        'shop',
        'article',
        'category',
        'image',
        'likes',

        'owner.id',
        'owner.firstname',
        'owner.lastname',

        'seller.id',
        'seller.firstname',
        'seller.lastname',

        'likeUser.id',
      ])

      .getOne();

    if (!shop) {
      throw new BadRequestException('Boutique introuvable');
    }

    if (userId) {
      for (const article of shop.articles) {
        article.isFavorite =
          Array.isArray(article.likes) &&
          article.likes.some((like) => like.user?.id === userId);
      }
    } else {
      for (const article of shop.articles) {
        article.isFavorite = false;
      }
    }

    let userRating: number | null = null;

    if (userId) {
      const rating = await this.shopRatingRepo.findOne({
        where: {
          shop: { id: shopId },
          user: { id: userId },
        },
      });

      userRating = rating ? rating.value : null;
    }

    return {
      ...shop,
      userRating,
    };
  }
}
