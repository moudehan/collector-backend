import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
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

  @UseGuards(KeycloakAuthGuard)
  @Post()
  create(@Body() dto: CreateShopDto, @CurrentUser() user: JwtUser) {
    return this.shopsService.createShop(dto, user);
  }

  @UseGuards(KeycloakAuthGuard)
  @Get('my')
  getMyShops(@CurrentUser() user: JwtUser) {
    return this.shopsService.getShopsByUser(user);
  }

  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  getAllShopsWithArticles() {
    return this.shopsService.getAllShopsWithArticles();
  }

  @UseGuards(KeycloakAuthGuard)
  @Get(':id')
  getShopById(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.shopsService.getShopById(id, user);
  }
}
