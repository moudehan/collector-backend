import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { JwtUser } from 'src/auth/user.type';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

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

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      userName: user.userName,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      created_at: user.created_at,
      stats: {
        totalShops: user.shops?.length || 0,
        totalArticles: user.articles?.length || 0,
        totalNotifications: user.notifications?.length || 0,
      },
    }));
  }

  async getUserById(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['shops', 'articles', 'notifications'],
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    return {
      id: user.id,
      email: user.email,
      userName: user.userName,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      created_at: user.created_at,
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
}
