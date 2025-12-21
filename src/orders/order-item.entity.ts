import { Order } from 'src/orders/order.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'article_id' })
  articleId: string;

  @Column()
  articleTitle: string;

  @Column({ type: 'float' })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'float', name: 'shipping_cost' })
  shippingCost: number;

  @Column({ name: 'shop_id' })
  shopId: string;

  @Column()
  shopName: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ name: 'seller_name' })
  sellerName: string;
}
