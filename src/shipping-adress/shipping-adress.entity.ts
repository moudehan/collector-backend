import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shipping_addresses')
export class ShippingAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  @Column({ name: 'line1', type: 'varchar', length: 255 })
  line1: string;

  @Column({ name: 'line2', type: 'varchar', length: 255, nullable: true })
  line2: string | null;

  @Column({ name: 'postal_code', type: 'varchar', length: 20 })
  postalCode: string;

  @Column({ name: 'city', type: 'varchar', length: 255 })
  city: string;

  @Column({ name: 'country', type: 'varchar', length: 2 })
  country: string;

  @Column({ name: 'phone', type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
