import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudModule } from 'src/fraud/fraud.module';
import { Notification } from 'src/notifications/notification.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ShopsModule } from 'src/shops/shops.module';
import { ArticleImage } from './article-image.entity';
import { ArticleLike } from './article-like.entity';
import { ArticleRating } from './article-rating.entity';
import { Article } from './article.entity';
import { ArticleGateway } from './article.gateway';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { PriceHistory } from './price-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      PriceHistory,
      ArticleLike,
      ArticleImage,
      ArticleRating,
    ]),
    FraudModule,
    NotificationsModule,
    ShopsModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticleGateway],
  exports: [ArticlesService],
})
export class ArticlesModule {}
