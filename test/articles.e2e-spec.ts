import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { KeycloakAuthGuard } from '../src/auth/keycloak-auth.guard';
import type { JwtUser } from '../src/auth/user.type';
import { UserRole } from '../src/users/user.entity';

import { CheckoutService } from '../src/checkout/checkout.service';

describe('Articles – e2e (public + authentifié)', () => {
  let app: INestApplication;

  beforeAll(async () => {
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
          const req = context
            .switchToHttp()
            .getRequest<
              { user?: JwtUser; kauth?: any } & Record<string, unknown>
            >();

          const fakeUser: JwtUser = {
            userId: 'user-id',
            sub: 'test-user-id',
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

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /articles/public doit répondre 200 (route publique)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await request(app.getHttpServer()).get('/articles/public').expect(200);
  });
});
