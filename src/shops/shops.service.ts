import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { JwtUser } from 'src/auth/user.type';
import { ShopRating } from 'src/shops/shop-rating.entity';
import { Shop } from 'src/shops/shop.entity';
import { UsersService } from 'src/users/users.service';
import { Repository } from 'typeorm';
import { CreateShopDto } from './dto/create-shop.dto';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
    @InjectRepository(ShopRating)
    private readonly shopRatingRepo: Repository<ShopRating>,
    private readonly usersService: UsersService,
  ) {}

  async createShop(dto: CreateShopDto, jwtUser: JwtUser) {
    const owner = await this.usersService.findOrCreateFromKeycloak(jwtUser);
    const existing = await this.shopRepo.findOne({
      where: {
        name: dto.name,
        owner: { id: owner.id },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Vous avez déjà créé une boutique avec ce nom.',
      );
    }

    const shop = this.shopRepo.create({
      ...dto,
      owner: owner,
    });

    return this.shopRepo.save(shop);
  }

  async getShopsByUser(jwtUser: JwtUser) {
    const owner = await this.usersService.findOrCreateFromKeycloak(jwtUser);
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
      .where('owner.id = :userId', { userId: owner.id })
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

  async getShopById(shopId: string, jwtUser?: JwtUser) {
    let currentUserId: string | undefined;

    if (jwtUser) {
      const user = await this.usersService.findOrCreateFromKeycloak(jwtUser);
      currentUserId = user.id;
    }

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

    if (currentUserId) {
      for (const article of shop.articles) {
        article.isFavorite =
          Array.isArray(article.likes) &&
          article.likes.some((like) => like.user?.id === currentUserId);
      }
    } else {
      for (const article of shop.articles) {
        article.isFavorite = false;
      }
    }

    let userRating: number | null = null;

    if (currentUserId) {
      const rating = await this.shopRatingRepo.findOne({
        where: {
          shop: { id: shopId },
          user: { id: currentUserId },
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
