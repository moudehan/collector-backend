import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Shop } from 'src/shops/shop.entity';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { CreateShopDto } from './dto/create-shop.dto';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
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

  async getShopById(shopId: string) {
    const shop = await this.shopRepo
      .createQueryBuilder('shop')
      .leftJoin('shop.owner', 'owner')
      .leftJoin('shop.articles', 'article')
      .leftJoin('article.category', 'category')
      .leftJoin('article.seller', 'seller')
      .leftJoin('article.images', 'image')
      .where('shop.id = :shopId', { shopId })
      .orderBy('article.created_at', 'DESC')
      .select([
        'shop.id',
        'shop.name',
        'shop.description',
        'shop.created_at',

        'owner.id',
        'owner.firstname',
        'owner.lastname',

        'article.id',
        'article.title',
        'article.description',
        'article.price',
        'article.created_at',

        'category.id',
        'category.name',

        'seller.id',
        'seller.firstname',
        'seller.lastname',

        'image.id',
        'image.url',
      ])
      .getOne();

    if (!shop) {
      throw new BadRequestException('Boutique introuvable');
    }

    return shop;
  }
}
