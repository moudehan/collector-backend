import { Category } from 'src/categories/category.entity';
import { Shop } from 'src/shops/shop.entity';
import { User } from 'src/users/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
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

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
