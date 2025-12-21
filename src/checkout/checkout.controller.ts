import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { ConfirmPaymentDto } from 'src/checkout/dto/confirm-payment.dto';
import { CreatePaymentIntentDto } from 'src/checkout/dto/create-payment-intent.dto';
import { CheckoutService } from './checkout.service';

@UseGuards(KeycloakAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}

  @Post('create-payment-intent')
  async createPaymentIntent(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.service.createPaymentIntent(user.sub, dto);
  }

  @Post('confirm')
  async confirm(@CurrentUser() user: JwtUser, @Body() dto: ConfirmPaymentDto) {
    return this.service.confirmOrder(user.sub, dto.paymentIntentId);
  }
}
