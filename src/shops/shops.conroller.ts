import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { CreateShopDto } from './dto/create-shop.dto';
import { ShopsService } from './shops.service';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('shops')
export class ShopsController {
  constructor(private shopsService: ShopsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateShopDto, @CurrentUser() user: JwtUser) {
    return this.shopsService.createShop(dto, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyShops(@CurrentUser() user: JwtUser) {
    return this.shopsService.getShopsByUser(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  getAllShopsWithArticles() {
    return this.shopsService.getAllShopsWithArticles();
  }
}
