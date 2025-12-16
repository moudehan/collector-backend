import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { BlacklistedToken } from 'src/auth/blacklist.entity';
import { UserRole } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { JwtUser } from './user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @InjectRepository(BlacklistedToken)
    private readonly blacklistRepo: Repository<BlacklistedToken>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecretkey',
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: { sub: string; email: string; role: UserRole | string },
  ): Promise<JwtUser> {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';

    const blacklisted: BlacklistedToken | null =
      await this.blacklistRepo.findOne({ where: { token } });

    if (blacklisted) {
      throw new UnauthorizedException('Session expirée — reconnectez-vous.');
    }

    return {
      sub: payload.sub,
      userId: payload.sub,
      email: payload.email,
      role: payload.role as UserRole,
    };
  }
}
