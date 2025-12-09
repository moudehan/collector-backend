import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { ShopRatingsService } from './shop-ratings.service';

@Controller('shop-ratings')
@UseGuards(JwtAuthGuard)
export class ShopRatingsController {
  constructor(private readonly ratingsService: ShopRatingsService) {}

  @Post(':shopId')
  @UseGuards(JwtAuthGuard)
  rate(
    @Param('shopId') shopId: string,
    @Body('value') value: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.ratingsService.rateShop(user.sub, shopId, value);
  }

  @Get(':shopId/me')
  @UseGuards(JwtAuthGuard)
  getMyRating(@Param('shopId') shopId: string, @CurrentUser() user: JwtUser) {
    return this.ratingsService.getUserRating(user.sub, shopId);
  }
}
