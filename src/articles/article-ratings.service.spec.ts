import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';
import { ArticleRatingsService } from './article-ratings.service';
import { Article } from './article.entity';
import { ArticleRating } from './article-rating.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ArticleRatingsService', () => {
  let service: ArticleRatingsService;
  const ratingRepo = createMockRepository<ArticleRating>();
  const articleRepo = createMockRepository<Article>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleRatingsService,
        { provide: getRepositoryToken(ArticleRating), useValue: ratingRepo },
        { provide: getRepositoryToken(Article), useValue: articleRepo },
      ],
    }).compile();

    service = module.get<ArticleRatingsService>(ArticleRatingsService);
    jest.clearAllMocks();
  });

  it('throws when rating value is out of range', async () => {
    await expect(service.rateArticle('u1', 'a1', 0)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.rateArticle('u1', 'a1', 6)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when article not found', async () => {
    (articleRepo.findOne as jest.Mock).mockResolvedValue(undefined);
    await expect(service.rateArticle('u1', 'a1', 4)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates existing rating and returns stats', async () => {
    (articleRepo.findOne as jest.Mock).mockResolvedValue({
      id: 'a2',
    } as Partial<Article>);
    (ratingRepo.findOne as jest.Mock).mockResolvedValue({
      id: 'r1',
      value: 3,
    });
    (ratingRepo.save as jest.Mock).mockResolvedValue({
      id: 'r1',
      value: 4,
    });

    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ avg: '4.00', count: '2' }),
    };
    (ratingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const savedArticle = { id: 'a2' };
    (articleRepo.save as jest.Mock).mockResolvedValue(savedArticle);

    const res = await service.rateArticle('u1', 'a2', 4);

    expect(ratingRepo.save).toHaveBeenCalled();
    expect(articleRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ avgRating: 4, ratingsCount: 2 }),
    );
    expect(res).toEqual({ success: true, avgRating: 4, ratingsCount: 2 });
  });

  it('creates new rating when none exists', async () => {
    (articleRepo.findOne as jest.Mock).mockResolvedValue({
      id: 'a3',
    } as Partial<Article>);
    (ratingRepo.findOne as jest.Mock).mockResolvedValue(undefined);
    const created = { value: 5 } as Partial<ArticleRating>;
    (ratingRepo.create as jest.Mock).mockReturnValue(created);
    (ratingRepo.save as jest.Mock).mockResolvedValue(created as ArticleRating);

    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ avg: '5.00', count: '1' }),
    };
    (ratingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const savedArticle = { id: 'a3' };
    (articleRepo.save as jest.Mock).mockResolvedValue(savedArticle);

    const res = await service.rateArticle('u1', 'a3', 5);

    expect(ratingRepo.create).toHaveBeenCalled();
    expect(ratingRepo.save).toHaveBeenCalled();
    expect(res).toEqual({ success: true, avgRating: 5, ratingsCount: 1 });
  });

  describe('getArticleRating', () => {
    it('returns zeroes when no stats', async () => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      (ratingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const res = await service.getArticleRating('aX');
      expect(res).toEqual({ avgRating: 0, ratingsCount: 0 });
    });

    it('parses numbers from raw stats', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '3.50', count: '4' }),
      };
      (ratingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const res = await service.getArticleRating('aY');
      expect(res).toEqual({ avgRating: 3.5, ratingsCount: 4 });
    });
  });
});
