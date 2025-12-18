import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ArticlesService } from './articles.service';

import { ArticleImage } from 'src/articles/article-image.entity';
import { ArticleLike } from 'src/articles/article-like.entity';
import { ArticleRating } from 'src/articles/article-rating.entity';
import { Article, ArticleStatus } from 'src/articles/article.entity';
import { PriceHistory } from 'src/articles/price-history.entity';

import { Notification } from 'src/notifications/notification.entity';
import { NotificationsService } from 'src/notifications/notifications.service';

import { ArticleGateway } from 'src/articles/article.gateway';
import { FraudService } from 'src/fraud/fraud.service';

describe('ArticlesService', () => {
  let service: ArticlesService;

  let articleRepo: Partial<Repository<Article>>;
  let priceHistoryRepo: Partial<Repository<PriceHistory>>;
  let articleLikeRepo: Partial<Repository<ArticleLike>>;
  let notificationRepo: Partial<Repository<Notification>>;
  let articleImageRepo: Partial<Repository<ArticleImage>>;
  let articleRatingRepo: Partial<Repository<ArticleRating>>;
  let fraudService: Partial<FraudService>;
  let articleGateway: Partial<ArticleGateway>;
  let notificationsService: Partial<NotificationsService>;

  beforeEach(async () => {
    articleRepo = {
      findOne: jest.fn(),
      increment: jest.fn(),
    };

    priceHistoryRepo = {};

    articleLikeRepo = {
      findOne: jest.fn(),
      insert: jest.fn(),
    };

    notificationRepo = {};
    articleImageRepo = {};
    articleRatingRepo = {};

    fraudService = {
      checkPriceAnomaly: jest.fn(),
    };

    articleGateway = {
      emitNewArticleInterest: jest.fn(),
    };

    notificationsService = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepo,
        },
        {
          provide: getRepositoryToken(PriceHistory),
          useValue: priceHistoryRepo,
        },
        {
          provide: getRepositoryToken(ArticleLike),
          useValue: articleLikeRepo,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepo,
        },
        {
          provide: getRepositoryToken(ArticleImage),
          useValue: articleImageRepo,
        },
        {
          provide: getRepositoryToken(ArticleRating),
          useValue: articleRatingRepo,
        },
        {
          provide: FraudService,
          useValue: fraudService,
        },
        {
          provide: ArticleGateway,
          useValue: articleGateway,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('follow should insert like and increment likesCount for an approved article', async () => {
    const articleId = 'article-1';
    const userId = 'user-1';

    const existingArticle: Article = {
      id: articleId,
      status: ArticleStatus.APPROVED,
    } as Article;

    (articleRepo.findOne as jest.Mock).mockResolvedValueOnce(existingArticle);

    (articleLikeRepo.findOne as jest.Mock).mockResolvedValueOnce(null);

    const result = await service.follow(articleId, userId);

    expect(articleLikeRepo.insert).toHaveBeenCalledWith({
      article: { id: articleId },
      user: { id: userId },
    });

    expect(articleRepo.increment).toHaveBeenCalledWith(
      { id: articleId },
      'likesCount',
      1,
    );

    expect(result).toEqual({
      success: true,
      message: 'Article suivi avec succès.',
    });
  });
});
