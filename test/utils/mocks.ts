import { fakeMyShopsResponse, fakeShopResponse } from './fakesDatasTests';
import { CheckoutService } from '../../src/checkout/checkout.service';
import { ShopsService } from '../../src/shops/shops.service';
import { INestApplication } from '@nestjs/common';
import { Server } from 'http';

export function makeCheckoutServiceMock() {
  return {
    createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_test' }),
    confirmPayment: jest.fn().mockResolvedValue({ status: 'succeeded' }),
  };
}

export function overrideCheckoutService() {
  return { token: CheckoutService, useValue: makeCheckoutServiceMock() };
}

export function makeShopsServiceMock(
  overrides: Partial<Record<string, any>> = {},
) {
  return {
    createShop: jest.fn().mockResolvedValue(fakeShopResponse()),
    getShopsByUser: jest.fn().mockResolvedValue(fakeMyShopsResponse()),
    getAllShopsWithArticles: jest.fn().mockResolvedValue([]),
    getShopById: jest
      .fn()
      .mockResolvedValue(fakeShopResponse({ userRating: null, articles: [] })),
    ...overrides,
  };
}

export function overrideShopsService(overrides?: Partial<Record<string, any>>) {
  return { token: ShopsService, useValue: makeShopsServiceMock(overrides) };
}

export function getServer(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}
