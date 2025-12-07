import { User } from 'src/users/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum NotificationType {
  NEW_ARTICLE = 'NEW_ARTICLE',
  PRICE_UPDATE = 'PRICE_UPDATE',
  SYSTEM = 'SYSTEM',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  created_by: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}
