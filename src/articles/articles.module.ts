import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudModule } from 'src/fraud/fraud.module';
import { Notification } from 'src/notifications/notification.entity';
import { ArticleLike } from './article-like.entity';
import { Article } from './article.entity';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { PriceHistory } from './price-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      PriceHistory,
      ArticleLike,
      Notification,
    ]),
    FraudModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
