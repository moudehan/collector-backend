import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';
import { ShopRatingsService } from './shop-ratings.service';
import { ShopRating } from './shop-rating.entity';
import { Shop } from './shop.entity';

describe('ShopRatingsService', () => {
  let service: ShopRatingsService;
  const ratingRepo = createMockRepository<ShopRating>();
  const shopRepo = createMockRepository<Shop>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopRatingsService,
        { provide: getRepositoryToken(ShopRating), useValue: ratingRepo },
        { provide: getRepositoryToken(Shop), useValue: shopRepo },
      ],
    }).compile();

    service = module.get<ShopRatingsService>(ShopRatingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rateShop should throw when shop not found', async () => {
    (shopRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.rateShop('u1', 's1', 4)).rejects.toThrow(
      'Boutique introuvable',
    );
  });

  it('rateShop should create new rating and update shop stats', async () => {
    (shopRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 's1',
    } as Partial<Shop>);
    (ratingRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    (ratingRepo.create as jest.Mock).mockReturnValueOnce({
      value: 4,
      user: { id: 'u1' },
      shop: { id: 's1' },
    });
    (ratingRepo.save as jest.Mock).mockResolvedValueOnce({
      id: 'r1',
      value: 4,
    });
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ avg: '4', count: '1' }),
    };
    (ratingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    (shopRepo.save as jest.Mock).mockResolvedValueOnce({
      id: 's1',
      avgRating: 4,
      ratingsCount: 1,
    });

    const res = await service.rateShop('u1', 's1', 4);
    expect(ratingRepo.save).toHaveBeenCalled();
    expect(shopRepo.save).toHaveBeenCalled();
    expect(res).toMatchObject({ success: true, avgRating: 4, ratingsCount: 1 });
  });

  it('getUserRating should return value or null', async () => {
    (ratingRepo.findOne as jest.Mock).mockResolvedValueOnce({ value: 5 });
    const r1 = await service.getUserRating('u1', 's1');
    expect(r1).toBe(5);

    (ratingRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    const r2 = await service.getUserRating('u1', 's1');
    expect(r2).toBeNull();
  });
});
