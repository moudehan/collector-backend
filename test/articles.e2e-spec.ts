import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { KeycloakAuthGuard } from '../src/auth/keycloak-auth.guard';
import type { JwtUser } from '../src/auth/user.type';
import { UserRole } from '../src/users/user.entity';

describe('Articles – e2e (public + authentifié)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(KeycloakAuthGuard)
      .useValue({
        createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_test' }),
        canActivate: (context: ExecutionContext): boolean => {
          const httpContext = context.switchToHttp();

          const req = httpContext.getRequest<
            {
              user?: JwtUser;
            } & Record<string, unknown>
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
    await request(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      app.getHttpServer(),
    )
      .get('/articles/public')
      .expect(200);
  });

  // it('GET /articles doit répondre 401 si non authentifié', async () => {
  //   // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  //   await request(app.getHttpServer()).get('/articles').expect(401);
  // });

  // it('GET /articles/mine doit répondre 200 pour un utilisateur authentifié', async () => {
  //   await request(
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  //     app.getHttpServer(),
  //   )
  //     .get('/articles/mine')
  //     .expect(200);
  // });
});
