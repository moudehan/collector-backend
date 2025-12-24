import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { KeycloakAuthGuard } from '../src/auth/keycloak-auth.guard';
import type { JwtUser } from '../src/auth/user.type';
import { UserRole } from '../src/users/user.entity';
import { CheckoutService } from '../src/checkout/checkout.service';

type CreateAppOpts = { authenticated: boolean };

async function createTestApp({ authenticated }: CreateAppOpts) {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
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

        const fakeUser: JwtUser = {
          userId: '00000000-0000-0000-0000-000000000001',
          sub: '00000000-0000-0000-0000-000000000001',
          email: 'test.user@example.com',
          role: UserRole.USER,
        };

        req.user = fakeUser;
        req.kauth = {
          grant: {
            access_token: {
              content: fakeUser,
            },
          },
        };

        return true;
      },
    })
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  return app;
}

describe("Articles - tests d'integration", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('GET /articles/public doit répondre 200 (route publique)', async () => {
    app = await createTestApp({ authenticated: true });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer()).get('/articles/public').expect(200);
  });

  it('GET /articles doit répondre 200 quand authentifié', async () => {
    app = await createTestApp({ authenticated: true });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer()).get('/articles').expect(200);
  });

  it('GET /articles doit répondre 401 quand non authentifié', async () => {
    app = await createTestApp({ authenticated: false });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer()).get('/articles').expect(401);
  });
});
