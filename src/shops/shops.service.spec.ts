import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';
import { ShopsService } from './shops.service';
import { Shop } from './shop.entity';
import { ShopRating } from './shop-rating.entity';
import { UsersService } from 'src/users/users.service';
import { BadRequestException } from '@nestjs/common';
import type { JwtUser } from 'src/auth/user.type';
import { SelectQueryBuilder } from 'typeorm';
import { CreateShopDto } from 'src/shops/dto/create-shop.dto';
import { User, UserRole } from 'src/users/user.entity';
import { Article, ArticleStatus } from 'src/articles/article.entity';
import { Category } from 'src/categories/category.entity';

describe('ShopsService', () => {
  let service: ShopsService;
  const shopRepo = createMockRepository<Shop>();
  const ratingRepo = createMockRepository<ShopRating>();
  const usersService: Partial<UsersService> = {
    isUserFraudulent: jest.fn().mockResolvedValue(false),
    findOrCreateFromKeycloak: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopsService,
        { provide: getRepositoryToken(Shop), useValue: shopRepo },
        { provide: getRepositoryToken(ShopRating), useValue: ratingRepo },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<ShopsService>(ShopsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createShop', () => {
    it('throws when a shop with same name already exists for user', async () => {
      const jwtUser = { sub: 'user-1' } as JwtUser;
      (usersService.findOrCreateFromKeycloak as jest.Mock).mockResolvedValue({
        id: 'user-1',
      });
      (shopRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'shop-1',
      } as Partial<Shop>);

      await expect(
        service.createShop({ name: 'My Shop' }, jwtUser),
      ).rejects.toThrow(BadRequestException);

      expect(usersService.findOrCreateFromKeycloak).toHaveBeenCalledWith(
        jwtUser,
      );
    });

    it('creates and saves a new shop when none exists', async () => {
      const jwtUser = { sub: 'user-2' } as JwtUser;
      const dto: CreateShopDto = {
        name: 'New Shop',
        description: 'desc',
      } as CreateShopDto;
      const owner = { id: 'user-2' };

      (usersService.findOrCreateFromKeycloak as jest.Mock).mockResolvedValue(
        owner,
      );
      (shopRepo.findOne as jest.Mock).mockResolvedValue(undefined);
      const created = { ...dto, owner } as Partial<Shop>;
      (shopRepo.create as jest.Mock).mockReturnValue(created);
      const saved = { id: 'shop-2', ...created };
      (shopRepo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.createShop(dto, jwtUser);

      expect(shopRepo.create).toHaveBeenCalledWith({ ...dto, owner: owner });
      expect(shopRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(saved);
    });
  });

  describe('getShopsByUser', () => {
    it('returns shops for the current user', async () => {
      const jwtUser = { sub: 'user-3' } as JwtUser;

      (usersService.findOrCreateFromKeycloak as jest.Mock).mockResolvedValue({
        id: 'user-3',
      });

      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }]),
      } as Partial<SelectQueryBuilder<Shop>>;

      (shopRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const res = await service.getShopsByUser(jwtUser);

      expect(usersService.findOrCreateFromKeycloak).toHaveBeenCalledWith(
        jwtUser,
      );
      expect(res).toEqual([{ id: 's1' }, { id: 's2' }]);
    });
  });

  describe('getAllShopsWithArticles', () => {
    it('forwards find call with relations and ordering', async () => {
      const shops = [{ id: 's1' }, { id: 's2' }];
      (shopRepo.find as jest.Mock).mockResolvedValue(shops as Partial<Shop>[]);

      const res = await service.getAllShopsWithArticles();

      expect(shopRepo.find).toHaveBeenCalled();
      expect(res).toEqual(shops);
    });
  });

  describe('getShopById', () => {
    it('throws when shop not found', async () => {
      const jwtUser = { sub: 'user-4' } as JwtUser;
      (usersService.findOrCreateFromKeycloak as jest.Mock).mockResolvedValue({
        id: 'user-4',
      });

      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(undefined),
      } as Partial<SelectQueryBuilder<Shop>>;

      (shopRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await expect(service.getShopById('shop-1', jwtUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns shop with isFavorite set and userRating when jwtUser provided', async () => {
      const jwtUser = { sub: 'user-5' } as JwtUser;
      (usersService.findOrCreateFromKeycloak as jest.Mock).mockResolvedValue({
        id: 'user-5',
      });

      const shop: Partial<Shop> = {
        id: 'shop-5',
        articles: [
          {
            id: 'a1',
            likes: [
              {
                user: {
                  id: 'user-5',
                  email: '',
                  password_hash: '',
                  firstname: '',
                  lastname: '',
                  userName: '',
                  role: UserRole.ADMIN,
                  shops: [],
                  articles: [],
                  notifications: [],
                  created_at: new Date(),
                  updated_at: new Date(),
                },
                id: '',
                article: new Article(),
              },
            ],
            shop: new Shop(),
            seller: new User(),
            title: '',
            description: '',
            price: 0,
            shipping_cost: 0,
            status: ArticleStatus.PENDING,
            category: new Category(),
            likesCount: 0,
            fraud_alerts: [],
            price_history: [],
            images: [],
            ratings: [],
            avgRating: 0,
            ratingsCount: 0,
            quantity: 0,
            vintageEra: null,
            productionYear: null,
            conditionLabel: null,
            vintageNotes: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 'a2',
            likes: [],
            shop: new Shop(),
            seller: new User(),
            title: '',
            description: '',
            price: 0,
            shipping_cost: 0,
            status: ArticleStatus.PENDING,
            category: new Category(),
            likesCount: 0,
            fraud_alerts: [],
            price_history: [],
            images: [],
            ratings: [],
            avgRating: 0,
            ratingsCount: 0,
            quantity: 0,
            vintageEra: null,
            productionYear: null,
            conditionLabel: null,
            vintageNotes: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(shop),
      };

      (shopRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      (ratingRepo.findOne as jest.Mock).mockResolvedValue({
        value: 4,
      } as Partial<ShopRating>);

      const res = (await service.getShopById('shop-5', jwtUser)) as unknown as {
        articles: Array<{ isFavorite?: boolean }>;
        userRating?: number | null;
      };

      expect(res.userRating).toEqual(4);
      expect(res.articles[0].isFavorite).toBe(true);
      expect(res.articles[1].isFavorite).toBe(false);
    });

    it('sets isFavorite false and userRating null when jwtUser not provided', async () => {
      const shop: Partial<Shop> = {
        id: 'shop-6',
        articles: [
          {
            id: 'a1',
            likes: [
              {
                user: {
                  id: 'someone',
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
            shop: new Shop(),
            seller: new User(),
            title: '',
            description: '',
            price: 0,
            shipping_cost: 0,
            status: ArticleStatus.PENDING,
            category: new Category(),
            likesCount: 0,
            fraud_alerts: [],
            price_history: [],
            images: [],
            ratings: [],
            avgRating: 0,
            ratingsCount: 0,
            quantity: 0,
            vintageEra: null,
            productionYear: null,
            conditionLabel: null,
            vintageNotes: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };

      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(shop),
      };

      (shopRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const res = (await service.getShopById('shop-6')) as unknown as {
        articles: Array<{ isFavorite?: boolean }>;
        userRating?: number | null;
      };

      expect(res.articles[0].isFavorite).toBe(false);
      expect(res.userRating).toEqual(null);
    });
  });
});
