import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop } from 'src/shops/shop.entity';
import { ShopRating } from './shop-rating.entity';
import { ShopRatingsController } from './shop-ratings.controller';
import { ShopRatingsService } from './shop-ratings.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShopRating, Shop])],
  controllers: [ShopRatingsController],
  providers: [ShopRatingsService],
  exports: [ShopRatingsService],
})
export class ShopRatingsModule {}
