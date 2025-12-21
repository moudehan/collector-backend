import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrderItem } from './order-item.entity';
import { OrderMailService } from './order-mail.service';
import { Order } from './order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

import { Article } from 'src/articles/article.entity';
import { MailModule } from 'src/mail/mail.module';
import { User } from 'src/users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, User, Article]),
    MailModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderMailService],
  exports: [OrdersService],
})
export class OrdersModule {}
