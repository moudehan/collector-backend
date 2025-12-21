import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Article } from 'src/articles/article.entity';
import { CartService } from 'src/cart/cart.service';
import { CartItem } from './cart-item.entity';
import { CartController } from './cart.controller';
import { Cart } from './cart.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, Article])],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
