import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConversationMessage } from './conversation-message.entity';

@Index(['articleId', 'shopId', 'buyerId', 'sellerId'], { unique: true })
@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  articleId: string;

  @Column()
  shopId: string;

  @Column()
  sellerId: string;

  @Column()
  buyerId: string;

  @OneToMany(() => ConversationMessage, (msg) => msg.conversation, {
    cascade: true,
  })
  messages: ConversationMessage[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
