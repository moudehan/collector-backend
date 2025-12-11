import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { BlacklistedToken } from 'src/auth/blacklist.entity';
import { User, UserRole } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BlacklistedToken)
    private blacklistRepo: Repository<BlacklistedToken>,
    private jwtService: JwtService,
  ) {}

  async register(data: RegisterDto) {
    const emailExists = await this.userRepo.findOne({
      where: { email: data.email },
    });
    if (emailExists)
      throw new BadRequestException('Cet email est déjà utilisé');

    const userName = `${data.firstName}_${data.lastName}`.toLowerCase();

    const userNameExists = await this.userRepo.findOne({
      where: { userName },
    });

    if (userNameExists)
      throw new BadRequestException('Ce nom d’utilisateur est déjà utilisé');

    const hashed = await bcrypt.hash(data.password, 10);

    const user = this.userRepo.create({
      email: data.email,
      password_hash: hashed,
      firstname: data.firstName,
      lastname: data.lastName,
      userName,
      role: UserRole.ADMIN,
    });

    await this.userRepo.save(user);
    return { message: 'Compte créé avec succès !' };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const match = await bcrypt.compare(dto.password, user.password_hash);
    if (!match) throw new UnauthorizedException('Identifiants invalides');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    return { access_token: token, role: user.role };
  }

  async logout(token: string) {
    if (!token) return { message: 'Aucun token fourni' };

    await this.blacklistRepo.save({ token });
    return { message: 'Déconnexion réussie' };
  }
}
