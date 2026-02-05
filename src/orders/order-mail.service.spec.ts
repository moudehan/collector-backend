import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';
import { OrderMailService } from './order-mail.service';
import { User } from 'src/users/user.entity';
import { Order } from 'src/orders/order.entity';
import { MailService } from 'src/mail/mail.service';

describe('OrderMailService', () => {
  let service: OrderMailService;
  const userRepo = createMockRepository<User>();
  const mailService: Partial<MailService> = { sendTestMail: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderMailService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<OrderMailService>(OrderMailService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOrderConfirmation', () => {
    it('does not send mail when buyer has no email', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'u1',
      });
      const order: Partial<Order> = {
        id: 'o1',
        userId: 'u1',
        totalAmount: 10,
        currency: 'EUR',
      };
      await service.sendOrderConfirmation(order as Order);
      expect(mailService.sendTestMail as jest.Mock).not.toHaveBeenCalled();
    });

    it('sends mail when buyer has email', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'u2',
        email: 'me@x.com',
        firstname: 'John',
        lastname: 'Doe',
      });
      const order: Partial<Order> = {
        id: 'o2',
        userId: 'u2',
        totalAmount: 123.45,
        currency: 'EUR',
      };
      await service.sendOrderConfirmation(order as Order);
      expect(mailService.sendTestMail as jest.Mock).toHaveBeenCalledWith(
        'me@x.com',
        expect.stringContaining('o2'),
        expect.any(String),
      );
    });
  });

  describe('sendOrderStatusUpdated', () => {
    it('sends buyer email and returns when no sellers', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'u3',
        email: 'u3@x.com',
      });
      const order: Partial<Order> = {
        id: 'o3',
        userId: 'u3',
        items: [],
        totalAmount: 0,
        currency: 'EUR',
      };
      await service.sendOrderStatusUpdated(order as Order);
      expect(mailService.sendTestMail as jest.Mock).toHaveBeenCalled();
      expect(userRepo.find).not.toHaveBeenCalled();
    });

    it('sends seller emails when present', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'u4',
        email: 'buyer@x.com',
      });
      const order: Partial<Order> = {
        id: 'o4',
        userId: 'u4',
        items: [
          {
            sellerId: 's1',
            quantity: 2,
            articleTitle: 'A',
            unitPrice: 1.5,
            id: '',
            order: new Order(),
            orderId: '',
            articleId: '',
            shippingCost: 0,
            shopId: '',
            shopName: '',
            sellerName: '',
          },
        ],
        totalAmount: 3,
        currency: 'EUR',
      };
      (userRepo.find as jest.Mock).mockResolvedValue([
        {
          id: 's1',
          email: 'seller@x.com',
          firstname: 'S',
          lastname: '1',
        } as Partial<any>,
      ]);

      await service.sendOrderStatusUpdated(order as Order);

      expect(mailService.sendTestMail as jest.Mock).toHaveBeenCalledTimes(2); // buyer + seller
    });
  });
});
