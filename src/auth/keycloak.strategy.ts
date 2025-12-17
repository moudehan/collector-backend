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
  given_name?: string;
  family_name?: string;
  name?: string;
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
        'KEYCLOAK_ISSUER non défini (ex: http://localhost:8081/realms/collector)',
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
    const hasAdminRole =
      realmRoles.includes('admin') || realmRoles.includes('ADMIN');

    const appRole: UserRole = hasAdminRole ? UserRole.ADMIN : UserRole.USER;

    const firstName =
      payload.given_name ??
      (payload.name ? payload.name.split(' ')[0] : undefined);

    const lastName =
      payload.family_name ??
      (payload.name ? payload.name.split(' ').slice(1).join(' ') : undefined);

    return {
      sub: payload.sub,
      userId: payload.sub,
      email: payload.email ?? payload.preferred_username ?? '',
      role: appRole,
      firstName,
      lastName,
      username: payload.preferred_username,
    };
  }
}
