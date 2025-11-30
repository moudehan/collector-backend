import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { User } from 'src/users/user.entity';

export enum NotificationType {
  PRICE_UPDATE = 'price_update',
  FRAUD_ALERT = 'fraud_alert',
  MESSAGE_RECEIVED = 'message_received',
  SYSTEM = 'system',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.notifications, { eager: true })
  user: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'json', nullable: true })
  payload: any;

  @CreateDateColumn()
  created_at: Date;
}
