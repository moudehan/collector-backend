import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { BlacklistedToken } from 'src/auth/blacklist.entity';
import { Repository } from 'typeorm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(BlacklistedToken)
    private readonly blacklistRepo: Repository<BlacklistedToken>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: { sub: string; email: string; role: string },
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';

    const blacklisted: BlacklistedToken | null =
      await this.blacklistRepo.findOne({ where: { token } });

    if (blacklisted) {
      throw new UnauthorizedException('Session expirée — reconnectez-vous.');
    }

    return payload;
  }
}
