import { Shop } from 'src/shops/shop.entity';
import { User } from 'src/users/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('shop_ratings')
@Unique(['user', 'shop'])
export class ShopRating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  value: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  shop: Shop;

  @CreateDateColumn()
  created_at: Date;
}
