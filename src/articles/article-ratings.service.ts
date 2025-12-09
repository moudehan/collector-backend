import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './article.entity';
import { ArticleRating } from './article-rating.entity';
import { User } from 'src/users/user.entity';

@Injectable()
export class ArticleRatingsService {
  constructor(
    @InjectRepository(ArticleRating)
    private readonly ratingRepo: Repository<ArticleRating>,

    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
  ) {}

  async rateArticle(
    userId: string,
    articleId: string,
    value: number,
  ): Promise<{ success: true; avgRating: number; ratingsCount: number }> {
    if (value < 1 || value > 5) {
      throw new BadRequestException('La note doit être entre 1 et 5');
    }

    const article = await this.articleRepo.findOne({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Article introuvable');
    }

    let rating = await this.ratingRepo.findOne({
      where: {
        user: { id: userId },
        article: { id: articleId },
      },
    });

    if (rating) {
      rating.value = value;
    } else {
      rating = this.ratingRepo.create({
        value,
        user: { id: userId } as User,
        article: { id: articleId } as Article,
      });
    }

    await this.ratingRepo.save(rating);

    const stats = await this.ratingRepo
      .createQueryBuilder('r')
      .select('AVG(r.value)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.articleId = :articleId', { articleId })
      .getRawOne<{ avg: string | null; count: string | null }>();

    const avg = stats?.avg ? Number(stats.avg) : 0;
    const count = stats?.count ? Number(stats.count) : 0;

    article.avgRating = avg;
    article.ratingsCount = count;
    await this.articleRepo.save(article);

    return {
      success: true,
      avgRating: avg,
      ratingsCount: count,
    };
  }

  async getArticleRating(
    articleId: string,
  ): Promise<{ avgRating: number; ratingsCount: number }> {
    const stats = await this.ratingRepo
      .createQueryBuilder('r')
      .select('AVG(r.value)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.articleId = :articleId', { articleId })
      .getRawOne<{ avg: string | null; count: string | null }>();

    return {
      avgRating: stats?.avg ? Number(stats.avg) : 0,
      ratingsCount: stats?.count ? Number(stats.count) : 0,
    };
  }
}
