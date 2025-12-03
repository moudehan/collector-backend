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
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { UserRole } from 'src/users/user.entity';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';

@Controller('articles')
export class ArticlesController {
  constructor(private service: ArticlesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateArticleDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.findOneById(id);
  }

  @Delete(':id')
  async deleteArticle(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  myArticles(@CurrentUser() user: JwtUser) {
    return this.service.findMine(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.service.reject(id);
  }

  @Get()
  publicCatalogue() {
    return this.service.publicCatalogue();
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  follow(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.follow(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  unfollow(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.unfollow(id, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/price/:newPrice')
  updatePrice(@Param('id') id: string, @Param('newPrice') newPrice: string) {
    return this.service.updatePrice(id, Number(newPrice));
  }

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  getRecommendations(@CurrentUser() user: JwtUser) {
    return this.service.getRecommendations(user.userId, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('following')
  getFollowing(@CurrentUser() user: JwtUser) {
    return this.service.getFollowing(user.userId);
  }
}
