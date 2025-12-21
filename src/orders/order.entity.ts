import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from './order-status.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'total_amount', type: 'float' })
  totalAmount: number;

  @Column({ name: 'currency', type: 'varchar', length: 3 })
  currency: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    name: 'stripe_payment_intent_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripePaymentIntentId: string | null;

  @Column({ name: 'shipping_full_name', type: 'varchar', length: 255 })
  shippingFullName: string;

  @Column({ name: 'shipping_line1', type: 'varchar', length: 255 })
  shippingLine1: string;

  @Column({
    name: 'shipping_line2',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  shippingLine2: string | null;

  @Column({ name: 'shipping_postal_code', type: 'varchar', length: 20 })
  shippingPostalCode: string;

  @Column({ name: 'shipping_city', type: 'varchar', length: 255 })
  shippingCity: string;

  @Column({ name: 'shipping_country', type: 'varchar', length: 2 })
  shippingCountry: string;

  @Column({
    name: 'shipping_phone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  shippingPhone: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
