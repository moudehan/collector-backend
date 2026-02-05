import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';
import { FraudService } from './fraud.service';
import { Article } from 'src/articles/article.entity';
import { PriceHistory } from 'src/articles/price-history.entity';
import { FraudAlert, FraudSeverity } from './fraud-alert.entity';
import { FraudGateway } from './fraud.gateway';
import { SelectQueryBuilder } from 'typeorm';

describe('FraudService', () => {
  let service: FraudService;
  const articleRepo = createMockRepository<Article>();
  const priceHistoryRepo = createMockRepository<PriceHistory>();
  const alertRepo = createMockRepository<FraudAlert>();
  const gateway: Partial<FraudGateway> = { emitNewAlert: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudService,
        { provide: getRepositoryToken(Article), useValue: articleRepo },
        {
          provide: getRepositoryToken(PriceHistory),
          useValue: priceHistoryRepo,
        },
        { provide: getRepositoryToken(FraudAlert), useValue: alertRepo },
        { provide: FraudGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<FraudService>(FraudService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkPriceAnomaly', () => {
    it('returns undefined when article not found', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValue(undefined);
      const res = await service.checkPriceAnomaly('a-1', 100);
      expect(res).toBeUndefined();
    });

    it('returns undefined when median is 0', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'a-2',
        price: 0,
        title: 'T',
      } as Partial<Article>);
      (priceHistoryRepo.find as jest.Mock).mockResolvedValue([]);

      const res = await service.checkPriceAnomaly('a-2', 50);
      expect(res).toBeUndefined();
      expect(alertRepo.save).not.toHaveBeenCalled();
    });

    it('does nothing when new price is within limits', async () => {
      (articleRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'a-3',
        price: 100,
        title: 'T',
      } as Partial<Article>);
      (priceHistoryRepo.find as jest.Mock).mockResolvedValue([
        { new_price: '90' },
      ]);

      const res = await service.checkPriceAnomaly('a-3', 95);
      expect(res).toBeUndefined();
      expect(alertRepo.save).not.toHaveBeenCalled();
    });

    it('creates an article alert and emits when overpriced significantly', async () => {
      const article = {
        id: 'a-4',
        price: 100,
        title: 'Too Expensive',
        seller: { id: 'u1' },
      } as Partial<Article>;
      (articleRepo.findOne as jest.Mock).mockResolvedValue(article);
      (priceHistoryRepo.find as jest.Mock).mockResolvedValue([
        { new_price: '100' },
      ]);

      const savedAlert = {
        id: 'alert-1',
        created_at: new Date(),
        severity: FraudSeverity.HIGH,
      };
      (alertRepo.save as jest.Mock).mockResolvedValue(savedAlert);

      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as Partial<SelectQueryBuilder<FraudAlert>>;
      (alertRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const res = await service.checkPriceAnomaly('a-4', 200);

      expect(alertRepo.save).toHaveBeenCalled();
      expect(gateway.emitNewAlert as jest.Mock).toHaveBeenCalled();
      expect(res).toMatchObject({ articleAlert: savedAlert });
    });

    it('creates a user alert when user has >=2 fraudulent alerts', async () => {
      const article = {
        id: 'a-5',
        price: 100,
        title: 'T',
        seller: { id: 'u2', userName: 'john' },
      } as Partial<Article>;
      (articleRepo.findOne as jest.Mock).mockResolvedValue(article);
      (priceHistoryRepo.find as jest.Mock).mockResolvedValue([
        { new_price: '100' },
      ]);

      const savedArticleAlert = {
        id: 'alert-2',
        created_at: new Date(),
        severity: FraudSeverity.HIGH,
      };
      const savedUserAlert = {
        id: 'alert-user',
        created_at: new Date(),
        severity: FraudSeverity.HIGH,
      };

      (alertRepo.save as jest.Mock)
        .mockResolvedValueOnce(savedArticleAlert)
        .mockResolvedValueOnce(savedUserAlert);

      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            { reason: 'Anomale 1' },
            { reason: 'Anomale 2' },
          ]),
      } as Partial<SelectQueryBuilder<FraudAlert>>;
      (alertRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const res = await service.checkPriceAnomaly('a-5', 0);

      expect(alertRepo.save).toHaveBeenCalledTimes(2);
      expect(gateway.emitNewAlert as jest.Mock).toHaveBeenCalledTimes(2);
      expect(res?.userAlert).toMatchObject(savedUserAlert);
    });
  });

  describe('getAlerts', () => {
    it('maps user_id when reason contains utilisateur', async () => {
      const alerts = [
        {
          id: '1',
          article: { seller: { id: 'u1' }, title: 't1' },
          reason: 'Problème utilisateur',
        },
        {
          id: '2',
          article: { seller: { id: 'u2' }, title: 't2' },
          reason: 'Autre',
        },
      ];

      (alertRepo.find as jest.Mock).mockResolvedValue(alerts);

      const res = await service.getAlerts();

      expect(res[0].user_id).toEqual('u1');
      expect(res[1].user_id).toBeNull();
    });
  });

  describe('marking and deleting alerts', () => {
    it('markAsRead calls update and returns success', async () => {
      (alertRepo.update as jest.Mock).mockResolvedValue(undefined);
      const res = await service.markAsRead('a1');
      expect(alertRepo.update).toHaveBeenCalledWith('a1', { is_read: true });
      expect(res).toEqual({ success: true });
    });

    it('markAllRead returns affected count', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      } as Partial<SelectQueryBuilder<FraudAlert>>;
      (alertRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      const res = await service.markAllRead();
      expect(res.affected).toEqual(3);
    });

    it('markAllUnread returns affected count', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      } as Partial<SelectQueryBuilder<FraudAlert>>;
      (alertRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      const res = await service.markAllUnread();
      expect(res.affected).toEqual(2);
    });

    it('deleteAlertsByArticleId calls delete with proper object', async () => {
      (alertRepo.delete as jest.Mock).mockResolvedValue(undefined);
      await service.deleteAlertsByArticleId('article-1');
      expect(alertRepo.delete).toHaveBeenCalledWith({
        article: { id: 'article-1' },
      });
    });
  });
});
