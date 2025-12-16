import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/users/user.entity';
import { ROLES_KEY } from './roles.decorator';
import type { JwtUser } from './user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ user: JwtUser }>();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Authentification requise');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Accès refusé');
    }

    return true;
  }
}
