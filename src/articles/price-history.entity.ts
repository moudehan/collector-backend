import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Article } from './article.entity';

@Entity('price_history')
export class PriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Article, (article) => article.price_history, {
    onDelete: 'CASCADE',
  })
  article: Article;

  @Column('decimal')
  old_price: number;

  @Column('decimal')
  new_price: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  changed_at: Date;
}
