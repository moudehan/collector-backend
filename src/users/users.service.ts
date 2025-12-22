import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { JwtUser } from 'src/auth/user.type';
import { FraudAlert } from 'src/fraud/fraud-alert.entity';
import { DeepPartial, Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './user.entity';

export interface UserProfileWithStatsDto {
  id: string;
  email: string;
  userName: string;
  firstname: string;
  lastname: string;
  role: UserRole;
  created_at: Date;
  stats: {
    totalShops: number;
    totalArticles: number;
    totalNotifications: number;
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(FraudAlert)
    private readonly alertRepo: Repository<FraudAlert>,
  ) {}

  async findOrCreateFromKeycloak(
    jwtUser: JwtUser,
  ): Promise<UserProfileWithStatsDto> {
    const {
      sub,
      email,
      role: jwtRole,
      firstName,
      lastName,
      username,
    } = jwtUser;

    if (!sub) {
      throw new BadRequestException('Token Keycloak invalide : sub manquant');
    }

    const validRoles = Object.values(UserRole) as string[];
    const rawRole = (jwtRole as string | undefined) ?? UserRole.USER;
    const safeRole: UserRole = validRoles.includes(rawRole)
      ? (rawRole as UserRole)
      : UserRole.USER;

    let user = await this.userRepo.findOne({
      where: { id: sub },
    });

    if (!user) {
      const baseUserName =
        username ?? email?.split('@')[0] ?? `user_${sub.substring(0, 8)}`;

      let finalFirstName = firstName;
      let finalLastName = lastName;

      if (!finalFirstName && !finalLastName) {
        if (baseUserName.includes('.')) {
          const [rawFirst, rawLast] = baseUserName.split('.', 2);
          finalFirstName =
            rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase();
          finalLastName =
            rawLast.charAt(0).toUpperCase() + rawLast.slice(1).toLowerCase();
        } else {
          const formatted =
            baseUserName.charAt(0).toUpperCase() +
            baseUserName.slice(1).toLowerCase();
          finalFirstName = formatted;
          finalLastName = formatted;
        }
      } else {
        const fallback =
          baseUserName.charAt(0).toUpperCase() +
          baseUserName.slice(1).toLowerCase();
        finalFirstName = finalFirstName ?? finalLastName ?? fallback;
        finalLastName = finalLastName ?? finalFirstName ?? fallback;
      }

      const dummyPasswordHash = await bcrypt.hash(sub, 10);

      const partial: DeepPartial<User> = {
        id: sub,
        email: email ?? `${baseUserName}@no-email.local`,
        userName: baseUserName,
        firstname: finalFirstName,
        lastname: finalLastName,
        role: safeRole,
        password_hash: dummyPasswordHash,
      };

      user = this.userRepo.create(partial);
      user = await this.userRepo.save(user);
    }

    const userWithRelations = await this.userRepo.findOne({
      where: { id: user.id },
      relations: ['shops', 'articles', 'notifications'],
    });

    if (!userWithRelations) {
      throw new NotFoundException('Utilisateur introuvable après création');
    }

    const totalShops = userWithRelations.shops?.length ?? 0;
    const totalArticles = userWithRelations.articles?.length ?? 0;
    const totalNotifications = userWithRelations.notifications?.length ?? 0;

    const result: UserProfileWithStatsDto = {
      id: userWithRelations.id,
      email: userWithRelations.email,
      userName: userWithRelations.userName,
      firstname: userWithRelations.firstname,
      lastname: userWithRelations.lastname,
      role: userWithRelations.role,
      created_at: userWithRelations.created_at,
      stats: {
        totalShops,
        totalArticles,
        totalNotifications,
      },
    };

    return result;
  }

  async findAllUsersWithStats() {
    const users = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.shops', 'shop')
      .leftJoinAndSelect('user.articles', 'article')
      .leftJoinAndSelect('user.notifications', 'notification')
      .select([
        'user.id',
        'user.email',
        'user.userName',
        'user.firstname',
        'user.lastname',
        'user.role',
        'user.created_at',
        'shop.id',
        'article.id',
        'notification.id',
      ])
      .orderBy('user.created_at', 'DESC')
      .getMany();

    const results = await Promise.all(
      users.map(async (user) => {
        const isFraudulent = await this.isUserFraudulent(user.id);

        return {
          id: user.id,
          email: user.email,
          userName: user.userName,
          firstname: user.firstname,
          lastname: user.lastname,
          role: user.role,
          created_at: user.created_at,
          isFraudulent,
          stats: {
            totalShops: user.shops?.length || 0,
            totalArticles: user.articles?.length || 0,
            totalNotifications: user.notifications?.length || 0,
          },
        };
      }),
    );

    return results;
  }

  async getUserById(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['shops', 'articles', 'notifications'],
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const isFraudulent = await this.isUserFraudulent(userId);

    return {
      id: user.id,
      email: user.email,
      userName: user.userName,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      created_at: user.created_at,
      isFraudulent,
      stats: {
        totalShops: user.shops.length,
        totalArticles: user.articles.length,
        totalNotifications: user.notifications.length,
      },
    };
  }

  async updateUser(
    targetUserId: string,
    connectedUser: JwtUser,
    data: UpdateUserDto,
  ) {
    const user = await this.userRepo.findOne({
      where: { id: targetUserId },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (
      connectedUser.sub !== targetUserId &&
      connectedUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Action interdite');
    }

    if (data.email && data.email !== user.email) {
      const emailExists = await this.userRepo.findOne({
        where: { email: data.email },
      });
      if (emailExists) throw new BadRequestException('Email déjà utilisé');
    }

    if (data.userName && data.userName !== user.userName) {
      const userNameExists = await this.userRepo.findOne({
        where: { userName: data.userName },
      });
      if (userNameExists)
        throw new BadRequestException('Nom d’utilisateur déjà utilisé');
    }

    if (data.password) {
      user.password_hash = await bcrypt.hash(data.password, 10);
    }

    if (data.email) user.email = data.email;
    if (data.firstname) user.firstname = data.firstname;
    if (data.lastname) user.lastname = data.lastname;
    if (data.userName) user.userName = data.userName;

    await this.userRepo.save(user);

    return { message: 'Utilisateur mis à jour avec succès' };
  }

  async deleteUser(targetUserId: string, connectedUser: JwtUser) {
    const user = await this.userRepo.findOne({
      where: { id: targetUserId },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (connectedUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Seul un admin peut supprimer un utilisateur',
      );
    }

    await this.userRepo.remove(user);

    return { message: 'Utilisateur supprimé avec succès' };
  }

  async isUserFraudulent(userId: string): Promise<boolean> {
    const alerts = await this.alertRepo
      .createQueryBuilder('alert')
      .leftJoin('alert.article', 'a')
      .leftJoin('a.seller', 'seller')
      .leftJoin('a.shop', 'shop')
      .leftJoin('shop.owner', 'owner')
      .where('seller.id = :userId OR owner.id = :userId', { userId })
      .getMany();

    const fraudulentCount = alerts.filter(
      (alert) => !alert.reason.toLowerCase().includes('utilisateur'),
    ).length;

    return fraudulentCount >= 2;
  }
}
