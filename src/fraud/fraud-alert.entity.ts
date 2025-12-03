import { Article } from 'src/articles/article.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum FraudSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Entity()
export class FraudAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Article, (article) => article.fraud_alerts, {
    onDelete: 'CASCADE',
  })
  article: Article;

  @Column({ type: 'enum', enum: FraudSeverity })
  severity: FraudSeverity;

  @Column()
  reason: string;

  @Column('float')
  average_price: number;

  @Column('float')
  last_price_recorded: number;

  @Column('int')
  diff_percent: number;

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}
