import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleRating } from './article-rating.entity';
import { ArticleRatingsController } from './article-ratings.controller';
import { ArticleRatingsService } from './article-ratings.service';
import { Article } from './article.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ArticleRating, Article])],
  controllers: [ArticleRatingsController],
  providers: [ArticleRatingsService],
  exports: [ArticleRatingsService],
})
export class ArticleRatingsModule {}
