import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';
import { NotificationMailService } from './notification-mail.service';
import { User } from 'src/users/user.entity';
import { MailService } from 'src/mail/mail.service';
import { NotificationType } from './notification.entity';

describe('NotificationMailService', () => {
  let service: NotificationMailService;
  const userRepo = createMockRepository<User>();
  const mailService = { sendTestMail: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationMailService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<NotificationMailService>(NotificationMailService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should not send mail if user has no email', async () => {
    (userRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      service.sendNotificationMail('u1', NotificationType.NEW_ARTICLE, {}),
    ).resolves.toBeUndefined();
    expect(mailService.sendTestMail).not.toHaveBeenCalled();
  });
});
