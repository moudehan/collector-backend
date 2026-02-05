import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutService } from './checkout.service';
import { CartService } from 'src/cart/cart.service';
import { ShippingAddressService } from 'src/shipping-adress/shipping-adress.service';
import { OrdersService } from 'src/orders/orders.service';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from 'src/checkout/dto/create-payment-intent.dto';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let stripe: { paymentIntents: { create: jest.Mock; retrieve: jest.Mock } };
  const cartService: Partial<CartService> = {
    getCartForUser: jest.fn(),
    clearCart: jest.fn(),
  };
  const shippingService: Partial<ShippingAddressService> = {
    upsertForUser: jest.fn(),
    getForUser: jest.fn(),
  };
  const ordersService: Partial<OrdersService> = { createFromCart: jest.fn() };

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: CartService, useValue: cartService },
        { provide: ShippingAddressService, useValue: shippingService },
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
    const stripeMock: Partial<Stripe> = {
      paymentIntents: {
        create: jest.fn().mockResolvedValue({ client_secret: 'c' }),
        retrieve: jest.fn().mockResolvedValue({ status: 'succeeded' }),
      } as unknown as Stripe['paymentIntents'],
    };
    (service as unknown as { stripe: Partial<Stripe> }).stripe = stripeMock;
    stripe = (
      service as unknown as {
        stripe: { paymentIntents: { create: jest.Mock; retrieve: jest.Mock } };
      }
    ).stripe as { paymentIntents: { create: jest.Mock; retrieve: jest.Mock } };
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentIntent', () => {
    it('throws on empty cart', async () => {
      (shippingService.upsertForUser as jest.Mock).mockResolvedValue({
        id: 'addr-1',
      });
      (cartService.getCartForUser as jest.Mock).mockResolvedValue({
        items: [],
      });

      await expect(
        service.createPaymentIntent('u1', {
          address: {
            fullName: 'T',
            line1: '1',
            postalCode: '00000',
            city: 'City',
            country: 'FR',
          },
        } as CreatePaymentIntentDto),
      ).rejects.toThrow('Panier vide');
    });

    it('throws on invalid amount (<= 0)', async () => {
      (shippingService.upsertForUser as jest.Mock).mockResolvedValue({
        id: 'addr-1',
      });
      (cartService.getCartForUser as jest.Mock).mockResolvedValue({
        items: [
          { quantity: 1, unitPrice: 0, article: { shipping_cost: null } },
        ],
        currency: 'EUR',
      });

      await expect(
        service.createPaymentIntent('u1', {
          address: {
            fullName: 'T',
            line1: '1',
            postalCode: '00000',
            city: 'City',
            country: 'FR',
          },
        } as CreatePaymentIntentDto),
      ).rejects.toThrow('Montant invalide');
    });

    it('creates payment intent and returns clientSecret and totals', async () => {
      (shippingService.upsertForUser as jest.Mock).mockResolvedValue({
        id: 'addr-2',
      });
      (cartService.getCartForUser as jest.Mock).mockResolvedValue({
        items: [
          { quantity: 2, unitPrice: 12.5, article: { shipping_cost: '3.5' } },
        ],
        currency: 'EUR',
      });

      const stripePI = { client_secret: 'secret-1' };
      stripe.paymentIntents.create.mockResolvedValue(stripePI);

      const res = await service.createPaymentIntent('u2', {
        address: {
          fullName: 'T',
          line1: '1',
          postalCode: '00000',
          city: 'City',
          country: 'FR',
        },
      } as CreatePaymentIntentDto);

      expect(res.clientSecret).toEqual('secret-1');
      expect(res.total).toBeCloseTo(28.5);
    });
  });

  describe('confirmOrder', () => {
    it('throws when payment intent not found', async () => {
      stripe.paymentIntents.retrieve.mockResolvedValue(null);
      await expect(service.confirmOrder('u1', 'pi-1')).rejects.toThrow(
        'PaymentIntent introuvable côté Stripe.',
      );
    });

    it('throws when payment not succeeded', async () => {
      stripe.paymentIntents.retrieve.mockResolvedValue({
        status: 'requires_payment_method',
      });
      await expect(service.confirmOrder('u1', 'pi-2')).rejects.toThrow(
        'Paiement non confirmé côté Stripe.',
      );
    });

    it('throws when cart is empty', async () => {
      stripe.paymentIntents.retrieve.mockResolvedValue({
        status: 'succeeded',
      });
      (cartService.getCartForUser as jest.Mock).mockResolvedValue({
        items: [],
      });
      await expect(service.confirmOrder('u1', 'pi-3')).rejects.toThrow(
        'Panier vide.',
      );
    });

    it('throws when shipping address not found', async () => {
      stripe.paymentIntents.retrieve.mockResolvedValue({
        status: 'succeeded',
      });
      (cartService.getCartForUser as jest.Mock).mockResolvedValue({
        items: [{ quantity: 1, unitPrice: 10, article: { shipping_cost: 0 } }],
        currency: 'EUR',
      });
      (shippingService.getForUser as jest.Mock).mockResolvedValue(undefined);

      await expect(service.confirmOrder('u1', 'pi-4')).rejects.toThrow(
        'Adresse de livraison introuvable. Merci de recommencer la commande.',
      );
    });

    it('creates order & clears cart on success', async () => {
      stripe.paymentIntents.retrieve.mockResolvedValue({
        status: 'succeeded',
      });
      (cartService.getCartForUser as jest.Mock).mockResolvedValue({
        items: [{ quantity: 1, unitPrice: 10, article: { shipping_cost: 0 } }],
        currency: 'EUR',
      });
      (shippingService.getForUser as jest.Mock).mockResolvedValue({
        id: 'addr-3',
      });
      const order = { id: 'order-1' };
      (ordersService.createFromCart as jest.Mock).mockResolvedValue(order);

      const res = await service.confirmOrder('u1', 'pi-5');

      expect(ordersService.createFromCart).toHaveBeenCalled();
      expect(cartService.clearCart).toHaveBeenCalledWith('u1');
      expect(res).toEqual(order);
    });
  });
});
