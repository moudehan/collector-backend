import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { ShippingAddressDto } from 'src/shipping-adress/dto/shipping-adress.dto';
import { ShippingAddressService } from 'src/shipping-adress/shipping-adress.service';

@UseGuards(KeycloakAuthGuard)
@Controller('me/shipping-address')
export class ShippingAddressController {
  constructor(private readonly service: ShippingAddressService) {}

  @Get()
  async getMyAddress(@CurrentUser() user: JwtUser) {
    return this.service.getForUser(user.sub);
  }

  @Put()
  async saveMyAddress(
    @CurrentUser() user: JwtUser,
    @Body() dto: ShippingAddressDto,
  ) {
    return this.service.upsertForUser(user.sub, dto);
  }
}
