import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { ArticlesService } from './articles.service';

import { ArticleImage } from 'src/articles/article-image.entity';
import { ArticleLike } from 'src/articles/article-like.entity';
import { ArticleRating } from 'src/articles/article-rating.entity';
import { Article, ArticleStatus } from 'src/articles/article.entity';
import { PriceHistory } from 'src/articles/price-history.entity';
import { User, UserRole } from 'src/users/user.entity';

import { Notification } from 'src/notifications/notification.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreateArticleDto } from 'src/articles/dto/create-article.dto';
import { UpdateArticleDto } from 'src/articles/dto/update-article.dto';
import { Shop } from 'src/shops/shop.entity';

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
    jest.spyOn(console, 'error').mockImplementation(() => {});
    articleRepo = {
      findOne: jest.fn(),
      increment: jest.fn(),
      decrement: jest.fn(),
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      manager: {
        getRepository: jest.fn().mockReturnValue({ findOne: jest.fn() }),
      } as unknown as import('typeorm').EntityManager,
      find: jest.fn(),
    };

    priceHistoryRepo = { save: jest.fn(), find: jest.fn() };

    articleLikeRepo = {
      findOne: jest.fn(),
      insert: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    notificationRepo = { save: jest.fn() };
    articleImageRepo = {
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    articleRatingRepo = { findOne: jest.fn() };

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

  it('create should approve article when no reasons and fraud check passes', async () => {
    const shop: Shop = {
      id: 's2',
      owner: {
        id: 'u2',
        email: '',
        password_hash: '',
        firstname: '',
        lastname: '',
        userName: '',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
      },
    } as Shop;
    (articleRepo.manager as import('typeorm').EntityManager).getRepository =
      jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(shop),
      });

    const savedArticle: Partial<Article> = { id: 'a2' };

    (articleRepo.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'a2',
        status: ArticleStatus.APPROVED,
        category: { id: 'c2' },
        seller: { id: 'u2' },
        shop: { id: 's2' },
      } as Article);

    (articleRepo.create as jest.Mock).mockReturnValueOnce(
      savedArticle as Article,
    );
    (articleRepo.save as jest.Mock).mockResolvedValueOnce(
      savedArticle as Article,
    );

    (fraudService.checkPriceAnomaly as jest.Mock).mockResolvedValueOnce(
      undefined,
    );

    const dto: CreateArticleDto = {
      title: 'Valid title here',
      description:
        'This is a sufficiently long description to pass the checks.',
      price: 100,
      shipping_cost: 5,
      shopId: shop.id,
      categoryId: 'c2',
      quantity: 2,
      productionYear: 2000,
    } as CreateArticleDto;

    const res = await service.create(dto, [], 'u2');

    expect(res).toBeDefined();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(ArticleStatus.APPROVED);
  });

  it('approve should throw when article not found', async () => {
    (articleRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.approve('noexist')).rejects.toThrow(
      'Article introuvable.',
    );
  });

  it('reject should validate reason and emit notification', async () => {
    const article: Partial<Article> = {
      id: 'a3',
      rejection_reason: null,
      seller: {
        id: 'u3',
        email: 'u3@example.com',
        password_hash: 'p',
        firstname: 'F',
        lastname: 'L',
        userName: 'u3',
        role: UserRole.USER,
        shops: [],
        articles: [],
        notifications: [],
        created_at: new Date(),
        updated_at: new Date(),
      },
    };
    (articleRepo.findOne as jest.Mock).mockResolvedValueOnce(
      article as Article,
    );
    (articleRepo.save as jest.Mock).mockResolvedValueOnce({
      ...article,
      status: ArticleStatus.REJECTED,
    } as Article);

    const savedNotif: Partial<Notification> = {
      id: 1,
      payload: { reason: 'r' },
      created_at: new Date(),
    };
    (notificationsService.send as jest.Mock).mockResolvedValueOnce(
      savedNotif as Notification,
    );

    await service.reject('a3', 'Raison valide');

    expect(articleRepo.save).toHaveBeenCalled();
    expect(articleGateway.emitNewArticleInterest).toHaveBeenCalled();
  });

  describe('create validation edge cases', () => {
    it('throws if categoryId is missing', async () => {
      const partialDto1 = { title: 't' } as Partial<CreateArticleDto>;
      await expect(
        service.create(partialDto1 as CreateArticleDto, [], 'u1'),
      ).rejects.toThrow('categoryId est requis');
    });

    it('throws if shopId is missing', async () => {
      const partialDto2 = {
        title: 't',
        categoryId: 'c1',
      } as Partial<CreateArticleDto>;
      await expect(
        service.create(partialDto2 as CreateArticleDto, [], 'u1'),
      ).rejects.toThrow('shopId est requis');
    });

    it('throws if shop not found', async () => {
      (articleRepo.manager as import('typeorm').EntityManager).getRepository =
        jest
          .fn()
          .mockReturnValue({ findOne: jest.fn().mockResolvedValue(undefined) });

      const dtoShopMissing = {
        title: 't',
        shopId: 's1',
        categoryId: 'c1',
      } as CreateArticleDto;
      await expect(service.create(dtoShopMissing, [], 'u1')).rejects.toThrow(
        'Boutique introuvable',
      );
    });

    it('throws when user is not the shop owner', async () => {
      const shop: Shop = {
        id: 'sX',
        owner: { id: 'owner-1' } as Partial<User>,
      } as Shop;
      (articleRepo.manager as import('typeorm').EntityManager).getRepository =
        jest
          .fn()
          .mockReturnValue({ findOne: jest.fn().mockResolvedValue(shop) });

      const dtoNotOwner = {
        title: 't',
        shopId: 'sX',
        categoryId: 'c1',
      } as CreateArticleDto;
      await expect(service.create(dtoNotOwner, [], 'u2')).rejects.toThrow(
        "Vous n'êtes pas autorisé à créer un article dans cette boutique.",
      );
    });

    it('throws when an article with same title exists', async () => {
      const owner2 = { id: 'u2' };
      const shop: Shop = { id: 's2', owner: owner2 } as Shop;
      (articleRepo.manager as import('typeorm').EntityManager).getRepository =
        jest
          .fn()
          .mockReturnValue({ findOne: jest.fn().mockResolvedValue(shop) });

      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'exists',
      } as Article);

      const dtoDuplicate = {
        title: 't',
        shopId: 's2',
        categoryId: 'c1',
      } as CreateArticleDto;
      await expect(service.create(dtoDuplicate, [], 'u2')).rejects.toThrow(
        'Vous avez déjà créé un article avec ce titre dans cette boutique.',
      );
    });
  });

  describe('findOneById and delete', () => {
    it('findOneById returns null when not found', async () => {
      const qb: Partial<SelectQueryBuilder<Article>> = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(undefined),
      } as Partial<SelectQueryBuilder<Article>>;
      (articleRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const res = await service.findOneById('not-exists');
      expect(res).toBeNull();
    });

    it('findOneById sets isFavorite and userRating when userId provided', async () => {
      const article: Partial<Article> = {
        id: 'a5',
        likes: [
          {
            user: {
              id: 'u5',
              email: '',
              password_hash: '',
              firstname: '',
              lastname: '',
              userName: '',
              role: UserRole.ADMIN,
              shops: [],
              articles: [],
              created_at: new Date(),
              updated_at: new Date(),
              notifications: [],
            },
            id: '',
            article: new Article(),
          },
        ],
      };
      const qb: Partial<SelectQueryBuilder<Article>> = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelectNested: jest.fn?.(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(article),
      } as Partial<SelectQueryBuilder<Article>>;
      (articleRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (articleRatingRepo.findOne as jest.Mock).mockResolvedValue({
        value: 3,
      } as Partial<ArticleRating>);

      const res = await service.findOneById('a5', 'u5');
      expect(res?.isFavorite).toBe(true);
      expect(res?.userRating).toBe(3);
    });

    it('delete throws when no affected rows', async () => {
      (articleRepo.delete as jest.Mock).mockResolvedValue({ affected: 0 });
      await expect(service.delete('x')).rejects.toThrow('Article non trouvé');
    });

    it('delete returns success when affected', async () => {
      (articleRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });
      const res = await service.delete('x');
      expect(res).toEqual({ success: true });
    });
  });

  describe('approve flow', () => {
    it('throws when article not found', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.approve('noexist')).rejects.toThrow(
        'Article introuvable.',
      );
    });

    it('approves and notifies interested users', async () => {
      const article: Partial<Article> = {
        id: 'a6',
        status: ArticleStatus.PENDING,
        category: {
          id: 'cat1',
          name: '',
          articles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        seller: {
          id: 'seller1',
          email: '',
          password_hash: '',
          firstname: '',
          lastname: '',
          userName: '',
          role: UserRole.ADMIN,
          shops: [],
          articles: [],
          created_at: new Date(),
          updated_at: new Date(),
          notifications: [],
        },
        title: 'T',
        shop: {
          id: 's',
          name: '',
          owner: new User(),
          articles: [],
          ratings: [],
          avgRating: 0,
          ratingsCount: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      };
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce(
        article as Article,
      );
      (articleRepo.save as jest.Mock).mockResolvedValueOnce({
        ...article,
        status: ArticleStatus.APPROVED,
      } as Article);

      const qb: Partial<SelectQueryBuilder<ArticleLike>> = {
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ userId: 'u1', total: 2 }]),
      } as Partial<SelectQueryBuilder<ArticleLike>>;
      (articleLikeRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      (notificationsService.send as jest.Mock).mockResolvedValue({
        id: 'n1',
        payload: { message: 'm' },
        created_at: new Date(),
      });

      const res = await service.approve('a6');
      expect(res.success).toBe(true);
      expect(articleGateway.emitNewArticleInterest).toHaveBeenCalled();
    });
  });

  describe('catalogues & follow/unfollow', () => {
    it('publicCatalogue forwards to query builder and returns list', async () => {
      const qb: Partial<SelectQueryBuilder<Article>> = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'p1' }]),
      } as Partial<SelectQueryBuilder<Article>>;
      (articleRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const res = await service.publicCatalogue('cat1');
      expect(res).toEqual([{ id: 'p1' }]);
    });

    it('privateCatalogue marks isFavorite when userId provided', async () => {
      const art = {
        id: 'a7',
        likes: [{ user: { id: 'u7' } }],
        likesCount: 0,
      } as Partial<Article>;
      const qb: Partial<SelectQueryBuilder<Article>> = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([art]),
      } as Partial<SelectQueryBuilder<Article>>;
      (articleRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const res = await service.privateCatalogue(undefined, 'u7');
      expect(res[0].isFavorite).toBe(true);
    });

    it('follow throws when not approved', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
        status: ArticleStatus.PENDING,
      } as Article);
      await expect(service.follow('a', 'u')).rejects.toThrow(
        'Vous ne pouvez suivre que des articles approuvés.',
      );
    });

    it('follow returns already followed when exists', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
        status: ArticleStatus.APPROVED,
      } as Article);
      (articleLikeRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'l1',
      } as Partial<ArticleLike>);
      const res = await service.follow('a', 'u');
      expect(res.success).toBe(false);
    });

    it('unfollow returns false when not following', async () => {
      (articleLikeRepo.findOne as jest.Mock).mockResolvedValueOnce(undefined);
      const res = await service.unfollow('a', 'u');
      expect(res.success).toBe(false);
    });

    it('unfollow deletes and decrements when exists', async () => {
      (articleLikeRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'l2',
      } as Partial<ArticleLike>);
      const res = await service.unfollow('a', 'u');
      expect(articleLikeRepo.delete).toHaveBeenCalledWith({
        article: { id: 'a' },
        user: { id: 'u' },
      });
      expect(articleRepo.decrement).toHaveBeenCalledWith(
        { id: 'a' },
        'likesCount',
        1,
      );
      expect(res.success).toBe(true);
    });

    it('getFollowing returns deduplicated favorite list', async () => {
      (articleLikeRepo.find as jest.Mock).mockResolvedValueOnce([
        { article: { id: 'a1' } },
        { article: { id: 'a1' } },
      ] as Partial<ArticleLike>[]);
      const res = await service.getFollowing('u1');
      expect(res.length).toBe(1);
      expect(res[0].isFavorite).toBe(true);
    });
  });

  describe('updatePrice', () => {
    it('throws when article not found', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce(undefined);
      await expect(service.updatePrice('x', 10)).rejects.toThrow(
        'Article introuvable',
      );
    });

    it('updates price and notifies followers', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'a8',
        price: 5,
      } as Partial<Article>);
      (priceHistoryRepo.save as jest.Mock).mockResolvedValueOnce(
        {} as Partial<PriceHistory>,
      );
      (articleRepo.save as jest.Mock).mockResolvedValueOnce(
        {} as Partial<Article>,
      );
      (articleLikeRepo.find as jest.Mock).mockResolvedValueOnce([
        { user: { id: 'u10' } },
      ] as Partial<ArticleLike>[]);
      (notificationRepo.save as jest.Mock).mockResolvedValue(
        {} as Partial<Notification>,
      );

      const res = await service.updatePrice('a8', 7);
      expect(res.success).toBe(true);
      expect(notificationRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateArticle', () => {
    it('throws when article not found', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce(undefined);
      const emptyUpdate: UpdateArticleDto = {} as UpdateArticleDto;
      await expect(
        service.updateArticle('no', emptyUpdate, [], 'u'),
      ).rejects.toThrow('Article introuvable');
    });

    it('throws when user is not seller', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'a9',
        seller: { id: 's1' },
      } as Partial<Article>);
      const emptyUpdate2: UpdateArticleDto = {} as UpdateArticleDto;
      await expect(
        service.updateArticle('a9', emptyUpdate2, [], 'u2'),
      ).rejects.toThrow('Non autorisé');
    });

    it('throws on invalid oldImages JSON', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'a10',
        seller: { id: 'u10' },
        images: [],
      });
      const badOldImages: UpdateArticleDto = {
        oldImages: 'notjson',
      } as UpdateArticleDto;
      await expect(
        service.updateArticle('a10', badOldImages, [], 'u10'),
      ).rejects.toThrow('oldImages invalide (JSON attendu).');
    });

    it('deletes removed images and saves new images', async () => {
      const existingImgs = [{ id: 'i1' }, { id: 'i2' }];
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'a11',
        seller: { id: 'u11' },
        images: existingImgs,
        price: 10,
      } as Partial<Article>);
      (articleImageRepo.delete as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);
      (articleImageRepo.create as jest.Mock) = jest
        .fn()
        .mockReturnValue({ url: 'u' });
      (articleImageRepo.save as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'a11',
        seller: { id: 'u11' },
        images: [{ id: 'i1' }, { id: 'n1' }],
        price: 10,
      } as Partial<Article>);
      (articleLikeRepo.find as jest.Mock).mockResolvedValueOnce(
        [] as Partial<ArticleLike>[],
      );

      await service.updateArticle(
        'a11',
        { oldImages: JSON.stringify([{ id: 'i1' }]) } as UpdateArticleDto,
        [{ filename: 'n1' }],
        'u11',
      );
      expect(articleImageRepo.delete as jest.Mock).toHaveBeenCalledWith(['i2']);
      expect(articleImageRepo.save as jest.Mock).toHaveBeenCalled();
    });

    it('handles price check failure by setting moderation reasons', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'a12',
        seller: { id: 'u12' },
        images: [],
        price: 10,
        status: ArticleStatus.APPROVED,
      });
      (fraudService.checkPriceAnomaly as jest.Mock).mockRejectedValueOnce(
        new Error('boom'),
      );
      (priceHistoryRepo.save as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);
      (articleRepo.save as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'a12',
        seller: { id: 'u12' },
        images: [],
        price: 20,
        status: ArticleStatus.PENDING,
      });

      (notificationsService.send as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);
      (articleLikeRepo.find as jest.Mock).mockResolvedValueOnce(
        [] as Partial<ArticleLike>[],
      );

      await service.updateArticle(
        'a12',
        { price: 20 } as UpdateArticleDto,
        [],
        'u12',
      );

      expect(articleRepo.save).toHaveBeenCalled();
    });

    it('sends notifications when status changes to approved and followers updated', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'a13',
        seller: { id: 'u13' },
        images: [],
        price: 10,
        status: ArticleStatus.PENDING,
      });
      (priceHistoryRepo.save as jest.Mock) = jest
        .fn()
        .mockResolvedValue(undefined);
      (articleRepo.save as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'a13',
        seller: { id: 'u13' },
        images: [],
        price: 10,
        status: ArticleStatus.APPROVED,
      });

      (notificationsService.send as jest.Mock) = jest.fn().mockResolvedValue({
        id: 'n1',
        payload: { message: 'm' },
        created_at: new Date(),
      });
      (articleLikeRepo.find as jest.Mock) = jest
        .fn()
        .mockResolvedValue([
          { user: { id: 'uother' } },
        ] as Partial<ArticleLike>[]);

      await service.updateArticle(
        'a13',
        { title: 'New title' } as UpdateArticleDto,
        [],
        'u13',
      );
      expect(notificationsService.send as jest.Mock).toHaveBeenCalled();
      expect(articleGateway.emitNewArticleInterest).toHaveBeenCalled();
    });
  });

  describe('getRecommendations', () => {
    it('returns empty when no likes', async () => {
      (articleLikeRepo.find as jest.Mock).mockResolvedValueOnce(
        [] as Partial<ArticleLike>[],
      );
      const res = await service.getRecommendations('any', 'user');
      expect(res).toEqual([]);
    });

    it('returns empty when no preferred categories', async () => {
      (articleLikeRepo.find as jest.Mock).mockResolvedValueOnce([
        { article: { id: 'x', category: { id: 'c1' } } },
      ] as Partial<ArticleLike>[]);
      const res = await service.getRecommendations('u', 'user');
      expect(res).toEqual([]);
    });

    it('returns filtered recommendations excluding liked and own articles', async () => {
      (articleLikeRepo.find as jest.Mock).mockResolvedValueOnce([
        { article: { id: 'a1', category: { id: 'c1' } } },
        { article: { id: 'a2', category: { id: 'c1' } } },
      ] as Partial<ArticleLike>[]);

      const qb: Partial<SelectQueryBuilder<Article>> = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'a3', seller: { id: 'someone' }, likesCount: 5 },
          ]),
      } as Partial<SelectQueryBuilder<Article>>;
      (articleRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const res = await service.getRecommendations('uX', 'user');
      expect(res.length).toBe(1);
    });
  });
});
