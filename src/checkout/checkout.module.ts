import { Module } from '@nestjs/common';
import { CartModule } from 'src/cart/cart.module';
import { OrdersModule } from 'src/orders/orders.module';
import { ShippingAddressModule } from 'src/shipping-adress/shipping-adress.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
@Module({
  imports: [CartModule, ShippingAddressModule, OrdersModule],
  providers: [CheckoutService],
  controllers: [CheckoutController],
})
export class CheckoutModule {}
