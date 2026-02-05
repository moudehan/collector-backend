import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { User, UserRole } from 'src/users/user.entity';
import { BlacklistedToken } from './blacklist.entity';
import { createMockRepository } from '../../test/utils/mock-repository';

describe('AuthService', () => {
  let service: AuthService;
  const userRepo = createMockRepository();
  const blacklistRepo = createMockRepository();
  const jwtService = { signAsync: jest.fn() } as Partial<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: getRepositoryToken(BlacklistedToken),
          useValue: blacklistRepo,
        },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('register should create account', async () => {
    (userRepo.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    const newUser: Partial<User> = {
      id: 'u-new',
      email: 'a@b.com',
      role: UserRole.USER,
    };
    (userRepo.create as jest.Mock).mockReturnValueOnce(newUser as User);
    (userRepo.save as jest.Mock).mockResolvedValueOnce(newUser as User);

    const res = await service.register({
      email: 'a@b.com',
      password: 'pass',
      firstName: 'A',
      lastName: 'B',
    });

    expect(res).toEqual({ message: 'Compte créé avec succès !' });
  });

  it('register should fail if email exists', async () => {
    (userRepo.findOne as jest.Mock).mockResolvedValueOnce({ id: 'u1' } as User);
    await expect(
      service.register({
        email: 'a@b.com',
        password: 'p',
        firstName: 'A',
        lastName: 'B',
      }),
    ).rejects.toThrow('Cet email est déjà utilisé');
  });

  it('login should return token on success', async () => {
    const password = 'secret';
    const hashed = await bcrypt.hash(password, 10);
    (userRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'u1',
      email: 'a@b.com',
      password_hash: hashed,
      role: UserRole.USER,
    } as User);
    (jwtService.signAsync as jest.Mock).mockResolvedValueOnce('jwt-token');

    const res = await service.login({ email: 'a@b.com', password });

    expect(res.access_token).toBe('jwt-token');
    expect(res.role).toBe(UserRole.USER);
  });

  it('login should throw when user not found', async () => {
    (userRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      service.login({ email: 'no@one', password: 'p' }),
    ).rejects.toThrow('Identifiants invalides');
  });

  it('logout with no token returns message', async () => {
    const res = await service.logout('');
    expect(res).toEqual({ message: 'Aucun token fourni' });
  });

  it('logout should save token when provided', async () => {
    (blacklistRepo.save as jest.Mock).mockResolvedValueOnce({});
    const res = await service.logout('tok');
    expect(blacklistRepo.save).toHaveBeenCalledWith({ token: 'tok' });
    expect(res).toEqual({ message: 'Déconnexion réussie' });
  });
});
