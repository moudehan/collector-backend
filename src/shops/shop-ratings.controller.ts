import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { ShopRatingsService } from './shop-ratings.service';

@Controller('shop-ratings')
@UseGuards(KeycloakAuthGuard)
export class ShopRatingsController {
  constructor(private readonly ratingsService: ShopRatingsService) {}

  @Post(':shopId')
  @UseGuards(KeycloakAuthGuard)
  rate(
    @Param('shopId') shopId: string,
    @Body('value') value: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.ratingsService.rateShop(user.sub, shopId, value);
  }

  @Get(':shopId/me')
  @UseGuards(KeycloakAuthGuard)
  getMyRating(@Param('shopId') shopId: string, @CurrentUser() user: JwtUser) {
    return this.ratingsService.getUserRating(user.sub, shopId);
  }
}
