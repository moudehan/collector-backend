import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createE2eApp } from './utils/e2e-app';
import { getServer, overrideCheckoutService } from './utils/mocks';

describe("Articles - tests d'integration", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('GET /articles/public -> 200', async () => {
    app = await createE2eApp({
      authenticated: true,
      providerOverrides: [overrideCheckoutService()],
    });

    await request(getServer(app)).get('/articles/public').expect(200);
  });

  it('GET /articles -> 200 quand authentifié', async () => {
    app = await createE2eApp({
      authenticated: true,
      providerOverrides: [overrideCheckoutService()],
    });

    await request(getServer(app)).get('/articles').expect(200);
  });

  it('GET /articles -> 401 quand non authentifié', async () => {
    app = await createE2eApp({
      authenticated: false,
      providerOverrides: [overrideCheckoutService()],
    });

    await request(getServer(app)).get('/articles').expect(401);
  });
});
