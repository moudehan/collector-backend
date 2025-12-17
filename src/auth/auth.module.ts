import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlacklistedToken } from 'src/auth/blacklist.entity';
import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { KeycloakJwtStrategy } from 'src/auth/keycloak.strategy';
import { User } from 'src/users/user.entity';
import { UsersModule } from 'src/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, BlacklistedToken]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecretkey',
      signOptions: { expiresIn: '1d' },
    }),
    PassportModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    KeycloakJwtStrategy,
    RolesGuard,
    JwtAuthGuard,
    KeycloakAuthGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    KeycloakAuthGuard,
    RolesGuard,
    PassportModule,
  ],
})
export class AuthModule {}
