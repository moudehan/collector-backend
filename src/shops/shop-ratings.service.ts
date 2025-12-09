import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShopRating } from 'src/shops/shop-rating.entity';
import { Shop } from 'src/shops/shop.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ShopRatingsService {
  constructor(
    @InjectRepository(ShopRating)
    private readonly ratingRepo: Repository<ShopRating>,

    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
  ) {}

  async rateShop(userId: string, shopId: string, value: number) {
    const shop = await this.shopRepo.findOne({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Boutique introuvable');

    let rating = await this.ratingRepo.findOne({
      where: {
        user: { id: userId },
        shop: { id: shopId },
      },
    });

    if (rating) {
      rating.value = value;
    } else {
      rating = this.ratingRepo.create({
        value,
        user: { id: userId },
        shop: { id: shopId },
      });
    }

    await this.ratingRepo.save(rating);

    const stats = await this.ratingRepo
      .createQueryBuilder('r')
      .select('AVG(r.value)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.shopId = :shopId', { shopId })
      .getRawOne<{ avg: string; count: string }>();

    shop.avgRating = Number(stats?.avg);
    shop.ratingsCount = Number(stats?.count);
    await this.shopRepo.save(shop);

    return {
      success: true,
      avgRating: shop.avgRating,
      ratingsCount: shop.ratingsCount,
    };
  }

  async getUserRating(userId: string, shopId: string) {
    const rating = await this.ratingRepo.findOne({
      where: {
        user: { id: userId },
        shop: { id: shopId },
      },
    });

    return rating?.value ?? null;
  }
}
