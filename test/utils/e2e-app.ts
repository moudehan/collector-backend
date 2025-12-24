import {
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  Type,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { KeycloakAuthGuard } from '../../src/auth/keycloak-auth.guard';
import { RolesGuard } from '../../src/auth/roles.guard';
import type { JwtUser } from '../../src/auth/user.type';
import { UserRole } from '../../src/users/user.entity';
import { fakeUser } from './fakesDatasTests';

export type ProviderOverride = {
  token: string | symbol | Type<unknown>;
  useValue: unknown;
};

export function keycloakGuardMock(opts: {
  authenticated: boolean;
  user?: JwtUser;
}) {
  return {
    canActivate: (context: ExecutionContext): boolean => {
      if (!opts.authenticated) {
        throw new UnauthorizedException('Missing or invalid Keycloak token');
      }

      const req = context
        .switchToHttp()
        .getRequest<
          { user?: JwtUser; kauth?: any } & Record<string, unknown>
        >();

      const u = opts.user ?? fakeUser();

      req.user = u;
      req.kauth = {
        grant: {
          access_token: {
            content: u,
          },
        },
      };

      return true;
    },
  };
}

export function rolesGuardMock(opts: { allowedRoles: UserRole[] }) {
  return {
    canActivate: (context: ExecutionContext): boolean => {
      const req = context.switchToHttp().getRequest<{ user?: JwtUser }>();
      const role = req.user?.role;

      if (!role || !opts.allowedRoles.includes(role)) {
        throw new ForbiddenException('Forbidden');
      }
      return true;
    },
  };
}

export async function createE2eApp(
  options: {
    authenticated?: boolean;
    user?: JwtUser;

    providerOverrides?: ProviderOverride[];

    enableRolesGuard?: boolean;
    allowedRoles?: UserRole[];
  } = {},
): Promise<INestApplication> {
  const {
    authenticated = true,
    user = fakeUser(),
    providerOverrides = [],
    enableRolesGuard = false,
    allowedRoles = [UserRole.ADMIN],
  } = options;

  const builder = Test.createTestingModule({
    imports: [AppModule],
  });

  for (const o of providerOverrides) {
    builder.overrideProvider(o.token).useValue(o.useValue);
  }

  builder
    .overrideGuard(KeycloakAuthGuard)
    .useValue(keycloakGuardMock({ authenticated, user }));

  if (enableRolesGuard) {
    builder
      .overrideGuard(RolesGuard)
      .useValue(rolesGuardMock({ allowedRoles }));
  }

  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}
