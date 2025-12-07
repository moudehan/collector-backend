import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ArticleImage } from './article-image.entity';
import { ArticleLike } from './article-like.entity';
import { Article } from './article.entity';
import { PriceHistory } from './price-history.entity';

import { Notification } from 'src/notifications/notification.entity'; // ✔️ AJOUTER ÇA

import { ArticleGateway } from 'src/articles/article.gateway';
import { FraudModule } from 'src/fraud/fraud.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      PriceHistory,
      ArticleLike,
      Notification,
      ArticleImage,
    ]),
    FraudModule,
    NotificationsModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticleGateway],
})
export class ArticlesModule {}
