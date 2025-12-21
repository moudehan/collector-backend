import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingAddressController } from 'src/shipping-adress/shhipping.controller';
import { ShippingAddress } from 'src/shipping-adress/shipping-adress.entity';
import { ShippingAddressService } from 'src/shipping-adress/shipping-adress.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShippingAddress])],
  providers: [ShippingAddressService],
  controllers: [ShippingAddressController],
  exports: [ShippingAddressService],
})
export class ShippingAddressModule {}
