import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType } from './notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationMailService } from './notification-mail.service';
import { BadRequestException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const repo = createMockRepository<Notification>();
  const gateway: Partial<NotificationsGateway> = { sendToUser: jest.fn() };
  const settingsService: Partial<NotificationSettingsService> = {
    getOrCreate: jest.fn().mockResolvedValue({
      NEW_ARTICLE: true,
      ARTICLE_UPDATED: true,
      ARTICLE_REJECTED: true,
      ARTICLE_APPROUVED: true,
      MAIL_ENABLED: false,
    }),
  };
  const mailService: Partial<NotificationMailService> = {
    sendNotificationMail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: repo },
        { provide: NotificationsGateway, useValue: gateway },
        { provide: NotificationSettingsService, useValue: settingsService },
        { provide: NotificationMailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getForUser', () => {
    it('throws when userId missing', () => {
      expect(() => service.getForUser('')).toThrow(BadRequestException);
    });

    it('forwards find to repo', async () => {
      (repo.find as jest.Mock).mockResolvedValue([{ id: 'n1' }]);
      const res = await service.getForUser('user-1');
      expect(repo.find).toHaveBeenCalled();
      expect(res).toEqual([{ id: 'n1' }]);
    });
  });

  describe('send', () => {
    it('throws when userId missing', async () => {
      await expect(
        service.send('', NotificationType.NEW_ARTICLE),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns null when setting disables notification', async () => {
      (settingsService.getOrCreate as jest.Mock).mockResolvedValueOnce({
        NEW_ARTICLE: false,
        MAIL_ENABLED: false,
      });
      const res = await service.send('u1', NotificationType.NEW_ARTICLE);
      expect(res).toBeNull();
    });

    it('creates, saves, emits and not sends mail when MAIL_ENABLED false', async () => {
      const created = {
        user: { id: 'u2' },
        type: NotificationType.NEW_ARTICLE,
        payload: {},
        is_read: false,
      } as Partial<Notification>;
      const saved = { id: 'n2', ...created } as Partial<Notification>;
      (repo.create as jest.Mock).mockReturnValue(created);
      (repo.save as jest.Mock).mockResolvedValue(saved);

      const res = await service.send(
        'u2',
        NotificationType.NEW_ARTICLE,
        { foo: 'bar' },
        'creator-1',
      );

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { foo: 'bar' },
          created_by: { id: 'creator-1' },
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(gateway.sendToUser as jest.Mock).toHaveBeenCalledWith('u2', saved);
      expect(mailService.sendNotificationMail).not.toHaveBeenCalled();
      expect(res).toEqual(saved);
    });

    it('sends mail when MAIL_ENABLED true', async () => {
      (settingsService.getOrCreate as jest.Mock).mockResolvedValueOnce({
        NEW_ARTICLE: true,
        MAIL_ENABLED: true,
      });
      const created = {
        user: { id: 'u3' },
        type: NotificationType.NEW_ARTICLE,
        payload: {},
        is_read: false,
      } as Partial<Notification>;
      const saved = { id: 'n3', ...created } as Partial<Notification>;
      (repo.create as jest.Mock).mockReturnValue(created);
      (repo.save as jest.Mock).mockResolvedValue(saved);

      const res = await service.send('u3', NotificationType.NEW_ARTICLE, {
        x: 1,
      });

      expect(
        mailService.sendNotificationMail as jest.Mock,
      ).toHaveBeenCalledWith('u3', NotificationType.NEW_ARTICLE, { x: 1 });
      expect(res).toEqual(saved);
    });
  });

  describe('mark methods', () => {
    it('markAsRead updates single id', async () => {
      (repo.update as jest.Mock).mockResolvedValue(undefined);
      const res = await service.markAsRead('n1');
      expect(repo.update).toHaveBeenCalledWith('n1', { is_read: true });
      expect(res).toEqual({ success: true });
    });

    it('markAllAsRead throws when no userId', async () => {
      await expect(service.markAllAsRead('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('markAllAsRead returns affected counts', async () => {
      (repo.update as jest.Mock).mockResolvedValue({ affected: 5 });
      const res = await service.markAllAsRead('user-4');
      expect(res.affected).toEqual(5);
    });

    it('markAllAsUnread throws when no userId', async () => {
      await expect(service.markAllAsUnread('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('markAllAsUnread returns affected counts', async () => {
      (repo.update as jest.Mock).mockResolvedValue({ affected: 7 });
      const res = await service.markAllAsUnread('user-5');
      expect(res.affected).toEqual(7);
    });
  });
});
