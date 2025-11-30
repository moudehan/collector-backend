import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { CreateShopDto } from './dto/create-shop.dto';
import { ShopsService } from './shops.service';

@Controller('shops')
export class ShopsController {
  constructor(private shopsService: ShopsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateShopDto, @CurrentUser() user: JwtUser) {
    return this.shopsService.createShop(dto, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyShops(@CurrentUser() user: JwtUser) {
    return this.shopsService.getShopsByUser(user.userId);
  }
}
