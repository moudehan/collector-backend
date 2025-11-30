import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Shop } from 'src/shops/shop.entity';
import { Article } from 'src/articles/article.entity';
import { Notification } from 'src/notifications/notification.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  firstname: string;

  @Column()
  lastname: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @OneToMany(() => Shop, (shop) => shop.owner)
  shops: Shop[];

  @OneToMany(() => Article, (article) => article.seller)
  articles: Article[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => Notification, (n) => n.user, { cascade: true })
  notifications: Notification[];
}
