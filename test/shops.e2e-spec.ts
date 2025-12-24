import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { ShopsService } from '../src/shops/shops.service';
import { UserRole } from '../src/users/user.entity';

import { createE2eApp } from './utils/e2e-app';
import {
  getServer,
  makeShopsServiceMock,
  overrideCheckoutService,
} from './utils/mocks';
import { fakeCreateShopDto, fakeUser } from './utils/fakesDatasTests';

describe('Shops – tests d’intégration', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('POST /shops -> 201 quand authentifié (create shop)', async () => {
    const shopsMock = makeShopsServiceMock();

    app = await createE2eApp({
      authenticated: true,
      providerOverrides: [
        { token: ShopsService, useValue: shopsMock },
        overrideCheckoutService(),
      ],
    });

    await request(getServer(app))
      .post('/shops')
      .send(fakeCreateShopDto())
      .expect(201);

    expect(shopsMock.createShop).toHaveBeenCalledTimes(1);
  });

  it('POST /shops -> 400 si payload invalide (name manquant)', async () => {
    const shopsMock = makeShopsServiceMock();

    app = await createE2eApp({
      authenticated: true,
      providerOverrides: [
        { token: ShopsService, useValue: shopsMock },
        overrideCheckoutService(),
      ],
    });

    await request(getServer(app)).post('/shops').send({}).expect(400);

    expect(shopsMock.createShop).not.toHaveBeenCalled();
  });

  it('POST /shops -> 401 quand non authentifié', async () => {
    const shopsMock = makeShopsServiceMock();

    app = await createE2eApp({
      authenticated: false,
      providerOverrides: [
        { token: ShopsService, useValue: shopsMock },
        overrideCheckoutService(),
      ],
    });

    await request(getServer(app))
      .post('/shops')
      .send(fakeCreateShopDto())
      .expect(401);
  });

  it('GET /shops/my -> 200 quand authentifié', async () => {
    const shopsMock = makeShopsServiceMock();

    app = await createE2eApp({
      authenticated: true,
      providerOverrides: [
        { token: ShopsService, useValue: shopsMock },
        overrideCheckoutService(),
      ],
    });

    await request(getServer(app)).get('/shops/my').expect(200);
  });

  it('GET /shops/admin/all -> 200 quand ADMIN', async () => {
    const shopsMock = makeShopsServiceMock();

    app = await createE2eApp({
      authenticated: true,
      user: fakeUser({ role: UserRole.ADMIN }),
      enableRolesGuard: true,
      allowedRoles: [UserRole.ADMIN],
      providerOverrides: [
        { token: ShopsService, useValue: shopsMock },
        overrideCheckoutService(),
      ],
    });

    await request(getServer(app)).get('/shops/admin/all').expect(200);
  });

  it('GET /shops/admin/all -> 403 quand USER', async () => {
    const shopsMock = makeShopsServiceMock();

    app = await createE2eApp({
      authenticated: true,
      user: fakeUser({ role: UserRole.USER }),
      enableRolesGuard: true,
      allowedRoles: [UserRole.ADMIN],
      providerOverrides: [
        { token: ShopsService, useValue: shopsMock },
        overrideCheckoutService(),
      ],
    });

    await request(getServer(app)).get('/shops/admin/all').expect(403);
  });
});
