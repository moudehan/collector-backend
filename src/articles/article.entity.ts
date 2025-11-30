import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Shop } from 'src/shops/shop.entity';
import { User } from 'src/users/user.entity';

export enum ArticleStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Shop, (shop) => shop.articles)
  shop: Shop;

  @ManyToOne(() => User, (user) => user.articles)
  seller: User;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column('decimal')
  price: number;

  @Column('decimal', { default: 0 })
  shipping_cost: number;

  @Column({
    type: 'enum',
    enum: ArticleStatus,
    default: ArticleStatus.PENDING,
  })
  status: ArticleStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
