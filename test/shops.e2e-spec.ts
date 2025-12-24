import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { KeycloakAuthGuard } from '../src/auth/keycloak-auth.guard';
import type { JwtUser } from '../src/auth/user.type';
import { UserRole } from '../src/users/user.entity';
import { RolesGuard } from '../src/auth/roles.guard';

import { ShopsService } from '../src/shops/shops.service';
import { CheckoutService } from 'src/checkout/checkout.service';

type CreateAppOpts = {
  authenticated: boolean;
  role?: UserRole;
};

function buildFakeUser(role: UserRole): JwtUser {
  return {
    userId: '00000000-0000-0000-0000-000000000001',
    sub: '00000000-0000-0000-0000-000000000001',
    email: 'test.user@example.com',
    role,
  };
}

async function createTestApp({
  authenticated,
  role = UserRole.USER,
}: CreateAppOpts) {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ShopsService)
    .useValue({
      createShop: jest.fn().mockResolvedValue({
        id: 'shop-id',
        name: 'Ma Boutique',
        description: 'Desc',
        created_at: new Date().toISOString(),
        owner: {
          id: '00000000-0000-0000-0000-000000000001',
          firstname: 'Test',
          lastname: 'User',
        },
      }),
      getShopsByUser: jest.fn().mockResolvedValue([
        {
          id: 'shop-id',
          name: 'Ma Boutique',
          description: 'Desc',
          created_at: new Date().toISOString(),
          owner: {
            id: '00000000-0000-0000-0000-000000000001',
            firstname: 'Test',
            lastname: 'User',
          },
        },
      ]),
      getAllShopsWithArticles: jest.fn().mockResolvedValue([]),
      getShopById: jest.fn().mockResolvedValue({
        id: 'shop-id',
        name: 'Ma Boutique',
        articles: [],
        userRating: null,
      }),
    })

    .overrideProvider(CheckoutService)
    .useValue({
      createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_test' }),
      confirmPayment: jest.fn().mockResolvedValue({ status: 'succeeded' }),
    })
    .overrideGuard(KeycloakAuthGuard)
    .useValue({
      canActivate: (context: ExecutionContext): boolean => {
        if (!authenticated) {
          throw new UnauthorizedException('Missing or invalid Keycloak token');
        }

        const req = context
          .switchToHttp()
          .getRequest<
            { user?: JwtUser; kauth?: any } & Record<string, unknown>
          >();

        const fakeUser = buildFakeUser(role);

        req.user = fakeUser;
        req.kauth = {
          grant: { access_token: { content: fakeUser } },
        };

        return true;
      },
    })

    .overrideGuard(RolesGuard)
    .useValue({
      canActivate: (context: ExecutionContext): boolean => {
        const req = context.switchToHttp().getRequest<{ user?: JwtUser }>();
        const userRole = req.user?.role;

        if (userRole !== UserRole.ADMIN) {
          throw new ForbiddenException('Forbidden');
        }
        return true;
      },
    })
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

describe('Shops – e2e (1 describe, avec/sans auth)', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('POST /shops -> 201 quand authentifié', async () => {
    app = await createTestApp({ authenticated: true, role: UserRole.USER });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer())
      .post('/shops')
      .send({ name: 'Ma Boutique', description: 'Desc' })
      .expect(201);
  });

  it('POST /shops -> 401 quand non authentifié', async () => {
    app = await createTestApp({ authenticated: false });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer())
      .post('/shops')
      .send({ name: 'Ma Boutique', description: 'Desc' })
      .expect(401);
  });

  it('GET /shops/my -> 200 quand authentifié', async () => {
    app = await createTestApp({ authenticated: true, role: UserRole.USER });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer()).get('/shops/my').expect(200);
  });

  it('GET /shops/my -> 401 quand non authentifié', async () => {
    app = await createTestApp({ authenticated: false });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer()).get('/shops/my').expect(401);
  });

  it('GET /shops/admin/all -> 200 quand ADMIN', async () => {
    app = await createTestApp({ authenticated: true, role: UserRole.ADMIN });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer()).get('/shops/admin/all').expect(200);
  });

  it('GET /shops/admin/all -> 403 quand USER', async () => {
    app = await createTestApp({ authenticated: true, role: UserRole.USER });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer()).get('/shops/admin/all').expect(403);
  });

  it('GET /shops/admin/all -> 401 quand non authentifié', async () => {
    app = await createTestApp({ authenticated: false });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer()).get('/shops/admin/all').expect(401);
  });

  it('GET /shops/:id -> 200 quand authentifié', async () => {
    app = await createTestApp({ authenticated: true });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer()).get('/shops/shop-id').expect(200);
  });

  it('GET /shops/:id -> 401 quand non authentifié', async () => {
    app = await createTestApp({ authenticated: false });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer()).get('/shops/shop-id').expect(401);
  });
});
