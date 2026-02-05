import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationSettings } from './notification-settings.entity';

describe('NotificationSettingsService', () => {
  let service: NotificationSettingsService;
  const repo = createMockRepository<NotificationSettings>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSettingsService,
        { provide: getRepositoryToken(NotificationSettings), useValue: repo },
      ],
    }).compile();

    service = module.get<NotificationSettingsService>(
      NotificationSettingsService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreate', () => {
    it('returns mapped settings when existing', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue({
        NEW_ARTICLE: false,
        ARTICLE_UPDATED: true,
        ARTICLE_REJECTED: false,
        ARTICLE_APPROUVED: true,
        MAIL_ENABLED: false,
      });
      const res = await service.getOrCreate('u1');
      expect(res.NEW_ARTICLE).toBe(false);
      expect(res.MAIL_ENABLED).toBe(false);
    });

    it('creates default settings when not found', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(undefined);
      (repo.create as jest.Mock).mockReturnValue({ user: { id: 'u2' } });
      (repo.save as jest.Mock).mockResolvedValue({
        user: { id: 'u2' },
        NEW_ARTICLE: true,
        ARTICLE_UPDATED: true,
        ARTICLE_REJECTED: true,
        ARTICLE_APPROUVED: true,
        MAIL_ENABLED: true,
      });

      const res = await service.getOrCreate('u2');
      expect(res.NEW_ARTICLE).toBe(true);
      expect(res.MAIL_ENABLED).toBe(true);
    });
  });

  describe('update', () => {
    it('creates settings if missing and applies payload', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(undefined);
      (repo.create as jest.Mock).mockReturnValue({ user: { id: 'u3' } });
      (repo.save as jest.Mock).mockResolvedValue({
        user: { id: 'u3' },
        NEW_ARTICLE: false,
        MAIL_ENABLED: false,
      });

      const res = await service.update('u3', {
        NEW_ARTICLE: false,
        MAIL_ENABLED: false,
      });
      expect(res.NEW_ARTICLE).toBe(false);
      expect(res.MAIL_ENABLED).toBe(false);
    });

    it('updates existing settings fields', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue({
        user: { id: 'u4' },
        NEW_ARTICLE: true,
        MAIL_ENABLED: true,
      });
      (repo.save as jest.Mock).mockResolvedValue({
        user: { id: 'u4' },
        NEW_ARTICLE: false,
        MAIL_ENABLED: true,
      });

      const res = await service.update('u4', { NEW_ARTICLE: false });
      expect(res.NEW_ARTICLE).toBe(false);
    });
  });
});
