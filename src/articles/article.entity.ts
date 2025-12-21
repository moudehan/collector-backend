import { ArticleRating } from 'src/articles/article-rating.entity';
import { PriceHistory } from 'src/articles/price-history.entity';
import { Category } from 'src/categories/category.entity';
import { FraudAlert } from 'src/fraud/fraud-alert.entity';
import { Shop } from 'src/shops/shop.entity';
import { User } from 'src/users/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ArticleImage } from './article-image.entity';
import { ArticleLike } from './article-like.entity';

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

  @ManyToOne(() => User, (user) => user.articles, {
    onDelete: 'CASCADE',
  })
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

  @ManyToOne(() => Category, (category) => category.articles, {
    onDelete: 'RESTRICT',
    nullable: false,
    eager: true,
  })
  category: Category;

  @OneToMany(() => ArticleLike, (like) => like.article)
  likes: ArticleLike[];

  @Column({ default: 0 })
  likesCount: number;

  isFavorite?: boolean;

  @OneToMany(() => FraudAlert, (alert) => alert.article)
  fraud_alerts: FraudAlert[];

  @OneToMany(() => PriceHistory, (ph) => ph.article)
  price_history: PriceHistory[];

  @OneToMany(() => ArticleImage, (img) => img.article, { cascade: true })
  images: ArticleImage[];

  @OneToMany(() => ArticleRating, (r) => r.article)
  ratings: ArticleRating[];

  @Column({ type: 'float', default: 0 })
  avgRating: number;

  @Column({ default: 0 })
  ratingsCount: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vintageEra: string | null;

  @Column({ type: 'int', nullable: true })
  productionYear: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  conditionLabel: string | null;

  @Column({ type: 'text', nullable: true })
  vintageNotes: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
