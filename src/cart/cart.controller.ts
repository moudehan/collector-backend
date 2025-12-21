import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AddToCartDto } from './dto/add-to-cart.dto';

import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { CartService } from 'src/cart/cart.service';
import { UpdateCartItemDto } from 'src/cart/dto/update-cart-item.dto';

@UseGuards(KeycloakAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Get()
  getCart(@CurrentUser() user: JwtUser) {
    return this.service.getCartForUser(user.sub);
  }

  @Post('items')
  addToCart(@Body() dto: AddToCartDto, @CurrentUser() user: JwtUser) {
    return this.service.addToCart(user.sub, dto);
  }

  @Patch('items/:cartItemId')
  updateCartItem(
    @Param('cartItemId') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.updateCartItem(user.sub, cartItemId, dto);
  }

  @Delete('items/:cartItemId')
  removeCartItem(
    @Param('cartItemId') cartItemId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.removeCartItem(user.sub, cartItemId);
  }

  @Delete('items')
  clearCart(@CurrentUser() user: JwtUser) {
    return this.service.clearCart(user.sub);
  }
}
