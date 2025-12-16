import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import * as jwksRsa from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from 'src/auth/user.type';
import { UserRole } from 'src/users/user.entity';

interface KeycloakRealmAccess {
  roles?: string[];
}

interface KeycloakJwtPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  realm_access?: KeycloakRealmAccess;
}

@Injectable()
export class KeycloakJwtStrategy extends PassportStrategy(
  Strategy,
  'keycloak',
) {
  constructor() {
    const issuer = process.env.KEYCLOAK_ISSUER;

    if (!issuer) {
      throw new Error(
        'KEYCLOAK_ISSUER non défini (ex: http://localhost:8080/realms/collector)',
      );
    }

    const jwksUri = `${issuer}/protocol/openid-connect/certs`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer,
      algorithms: ['RS256'],
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri,
      }),
    });
  }

  validate(payload: KeycloakJwtPayload): JwtUser {
    const realmRoles = payload.realm_access?.roles ?? [];
    const firstRole: string = realmRoles[0] ?? 'USER';
    const appRole = firstRole as UserRole;

    return {
      sub: payload.sub,
      userId: payload.sub,
      email: payload.email ?? payload.preferred_username ?? '',
      role: appRole,
    };
  }
}
