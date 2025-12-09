import { User } from 'src/users/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class NotificationSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ default: true })
  NEW_ARTICLE: boolean;

  @Column({ default: true })
  ARTICLE_UPDATED: boolean;

  @Column({ default: true })
  MAIL_ENABLED: boolean;
}
