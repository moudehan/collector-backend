import { Article } from 'src/articles/article.entity';
import { ShopRating } from 'src/shops/shop-rating.entity';
import { User } from 'src/users/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('shops')
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;
  @ManyToOne(() => User, (user) => user.shops, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  owner: User;

  @OneToMany(() => Article, (article) => article.shop, { cascade: [] })
  articles: Article[];

  @OneToMany(() => ShopRating, (r) => r.shop)
  ratings: ShopRating[];

  @Column({ type: 'float', default: 0 })
  avgRating: number;

  userRating?: number | null;

  @Column({ default: 0 })
  ratingsCount: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
