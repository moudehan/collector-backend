import { Article } from 'src/articles/article.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum FraudSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('fraud_alerts')
export class FraudAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Article)
  article: Article;

  @Column()
  reason: string;

  @Column({ type: 'enum', enum: FraudSeverity })
  severity: FraudSeverity;

  @Column({ type: 'float', nullable: true })
  average_price: number;

  @Column({ type: 'float', nullable: true })
  last_price_recorded: number;

  @Column({ type: 'float', nullable: true })
  diff_percent: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
