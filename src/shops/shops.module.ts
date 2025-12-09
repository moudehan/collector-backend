import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopRating } from 'src/shops/shop-rating.entity';
import { Shop } from './shop.entity';
import { ShopsController } from './shops.conroller';
import { ShopsService } from './shops.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, ShopRating])],
  controllers: [ShopsController],
  providers: [ShopsService],
})
export class ShopsModule {}
