import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Article } from 'src/articles/article.entity';
import { Cart } from 'src/cart/cart.entity';
import { CartItem } from 'src/cart/cart-item.entity';
import { ShippingAddress } from 'src/shipping-adress/shipping-adress.entity';
import { OrderMailService } from './order-mail.service';
import { createMockRepository } from '../../test/utils/mock-repository';

describe('OrdersService', () => {
  let service: OrdersService;
  const orderRepo = createMockRepository();
  const orderItemRepo = createMockRepository();
  const articleRepo = createMockRepository();
  const mailService = {
    sendOrderConfirmation: jest.fn(),
    sendOrderStatusUpdated: jest.fn(),
  } as Partial<OrderMailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemRepo },
        { provide: getRepositoryToken(Article), useValue: articleRepo },
        { provide: OrderMailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createFromCart should throw on empty cart', async () => {
    const emptyCart: Cart = {
      id: 'c-empty',
      userId: 'u1',
      items: [],
      currency: 'EUR',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Cart;

    const address: ShippingAddress = {
      id: 'addr-1',
      userId: 'u1',
      fullName: '',
      line1: '',
      line2: null,
      postalCode: '',
      city: '',
      country: '',
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ShippingAddress;

    await expect(
      service.createFromCart({
        userId: 'u1',
        cart: emptyCart,
        total: 0,
        currency: 'EUR',
        paymentIntentId: '',
        address,
      }),
    ).rejects.toThrow('Panier vide');
  });

  it('createFromCart should create order on valid cart', async () => {
    const articleEntity: Article = {
      id: 'a1',
      title: 'A',
      quantity: 5,
    } as Article;

    const cart: Cart = {
      id: 'c1',
      userId: 'u1',
      items: [],
      currency: 'EUR',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Cart;

    const cartItem: CartItem = {
      id: 'ci1',
      cart,
      article: articleEntity,
      quantity: 2,
      unitPrice: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CartItem;

    cart.items.push(cartItem);

    (articleRepo.find as jest.Mock)
      .mockResolvedValueOnce([articleEntity])
      .mockResolvedValueOnce([articleEntity]);
    (articleRepo.save as jest.Mock).mockResolvedValueOnce([articleEntity]);

    const savedOrder: Partial<Order> = { id: 'o1', items: [] };
    (orderRepo.create as jest.Mock).mockReturnValueOnce({} as Order);
    (orderRepo.save as jest.Mock).mockResolvedValueOnce(savedOrder as Order);

    const savedItems: OrderItem[] = [{ id: 'oi1', orderId: 'o1' } as OrderItem];
    (orderItemRepo.create as jest.Mock).mockImplementation(
      (it) => it as OrderItem,
    );
    (orderItemRepo.save as jest.Mock).mockResolvedValueOnce(savedItems);

    const address: ShippingAddress = {
      id: 'addr-1',
      userId: 'u1',
      fullName: 'T',
      line1: 'L1',
      line2: null,
      postalCode: '0000',
      city: 'C',
      country: 'FR',
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ShippingAddress;

    const res = await service.createFromCart({
      userId: 'u1',
      cart,
      total: 20,
      currency: 'EUR',
      paymentIntentId: 'pi',
      address,
    });

    expect(orderRepo.save).toHaveBeenCalled();
    expect(orderItemRepo.save).toHaveBeenCalled();
    expect(mailService.sendOrderConfirmation).toHaveBeenCalled();
    expect(res.items).toBeDefined();
  });
});
