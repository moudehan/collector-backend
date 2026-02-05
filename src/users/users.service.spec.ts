import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';
import { JwtUser } from 'src/auth/user.type';
import { FraudAlert } from 'src/fraud/fraud-alert.entity';
import { SelectQueryBuilder } from 'typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';

describe('UsersService', () => {
  let service: UsersService;
  const userRepo = createMockRepository();
  const alertRepo = createMockRepository();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(FraudAlert), useValue: alertRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findOrCreateFromKeycloak should throw if sub missing', async () => {
    await expect(
      service.findOrCreateFromKeycloak({} as unknown as JwtUser),
    ).rejects.toThrow('Token Keycloak invalide : sub manquant');
  });

  it('findOrCreateFromKeycloak should create user when not exists', async () => {
    const jwtUser = {
      sub: 'user-1',
      userId: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
    };

    const savedUser = {
      id: 'user-1',
      email: 'test@example.com',
      userName: 'testuser',
      firstname: 'Test',
      lastname: 'User',
      role: UserRole.USER,
      created_at: new Date(),
      shops: [],
      articles: [],
      notifications: [],
    };

    (userRepo.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(savedUser);

    (userRepo.create as jest.Mock).mockReturnValueOnce(savedUser);
    (userRepo.save as jest.Mock).mockResolvedValueOnce(savedUser);

    const res = await service.findOrCreateFromKeycloak(jwtUser);

    expect(res.id).toEqual('user-1');
    expect(res.stats.totalArticles).toEqual(0);
  });

  describe('findAllUsersWithStats & getUserById', () => {
    it('findAllUsersWithStats returns mapped users and uses isUserFraudulent', async () => {
      (userRepo.createQueryBuilder as jest.Mock) = jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([
          {
            id: 'u1',
            shops: [],
            articles: [],
            notifications: [],
            created_at: new Date(),
            email: 'a@a',
          },
        ]),
      });

      jest.spyOn(service, 'isUserFraudulent').mockResolvedValueOnce(true);

      const res = await service.findAllUsersWithStats();
      expect(res[0].isFraudulent).toBe(true);
      expect(res[0].stats.totalShops).toBe(0);
    });

    it('getUserById throws when not found', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValueOnce(undefined);
      await expect(service.getUserById('no')).rejects.toThrow(
        'Utilisateur introuvable',
      );
    });

    it('getUserById returns user with isFraudulent', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValueOnce({
        id: 'u2',
        shops: [],
        articles: [],
        notifications: [],
        created_at: new Date(),
        email: 'b@b',
      } as Partial<User>);
      jest.spyOn(service, 'isUserFraudulent').mockResolvedValueOnce(false);
      const res = await service.getUserById('u2');
      expect(res.isFraudulent).toBe(false);
    });
  });

  describe('updateUser & deleteUser', () => {
    it('updateUser throws when user not found', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValueOnce(undefined);
      await expect(
        service.updateUser(
          'x',
          {
            sub: 'me',
            userId: '',
            email: '',
            role: UserRole.ADMIN,
          },
          { firstname: 'A' },
        ),
      ).rejects.toThrow('Utilisateur introuvable');
    });

    it('updateUser forbids non-owner non-admin', async () => {
      const user = {
        id: 'u3',
        email: 'e',
        userName: 'u',
        password_hash: '',
        firstname: '',
        lastname: '',
        role: UserRole.USER,
      };
      (userRepo.findOne as jest.Mock).mockResolvedValueOnce(user);
      await expect(
        service.updateUser(
          'u3',
          {
            sub: 'other',
            role: UserRole.USER,
            userId: '',
            email: '',
          },
          {},
        ),
      ).rejects.toThrow('Action interdite');
    });

    it('updateUser checks email and username uniqueness and updates password', async () => {
      const user = {
        id: 'u4',
        email: 'e',
        userName: 'u',
        password_hash: '',
        firstname: '',
        lastname: '',
        role: UserRole.USER,
      };
      (userRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(user) // get target
        .mockResolvedValueOnce(undefined) // emailExists
        .mockResolvedValueOnce(undefined); // userNameExists

      (userRepo.save as jest.Mock).mockResolvedValueOnce(user);

      const res = await service.updateUser(
        'u4',
        {
          sub: 'u4',
          role: UserRole.USER,
          userId: '',
          email: '',
        },
        { email: 'new', userName: 'newu', password: 'pass' },
      );
      expect(res).toEqual({ message: 'Utilisateur mis à jour avec succès' });
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('deleteUser forbids non-admin and deletes when admin', async () => {
      const user = { id: 'u5' };
      (userRepo.findOne as jest.Mock).mockResolvedValueOnce(user);
      await expect(
        service.deleteUser('u5', {
          sub: 'x',
          role: UserRole.USER,
          userId: '',
          email: '',
        }),
      ).rejects.toThrow();

      (userRepo.findOne as jest.Mock).mockResolvedValueOnce(user);
      (userRepo.remove as jest.Mock).mockResolvedValueOnce(undefined);
      const res = await service.deleteUser('u5', {
        sub: 'admin',
        role: UserRole.ADMIN,
        userId: '',
        email: '',
      });
      expect(res).toEqual({ message: 'Utilisateur supprimé avec succès' });
    });
  });

  describe('isUserFraudulent', () => {
    it('calculates fraudulent based on alerts', async () => {
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ reason: 'foo' }, { reason: 'bar' }]),
      } as Partial<SelectQueryBuilder<FraudAlert>>;
      (alertRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      const res = await service.isUserFraudulent('uX');
      expect(res).toBe(true);
    });
  });
});
