import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { UserRole } from 'src/users/user.entity';
import { CreateShopDto } from './dto/create-shop.dto';
import { ShopsService } from './shops.service';

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
    return this.shopsService.getShopsByUser(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  getAllShopsWithArticles() {
    return this.shopsService.getAllShopsWithArticles();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getShopById(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.shopsService.getShopById(id, user.sub);
  }
}
